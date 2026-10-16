import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, hash) {
  try {
    const [salt, key] = hash.split(":");
    return timingSafeEqual(
      Buffer.from(key, "hex"),
      scryptSync(password, salt, 64),
    );
  } catch {
    return false;
  }
}
export function openDatabase(
  path = process.env.DATABASE_PATH || resolve(".data/stuard.sqlite"),
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS runtime_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','student','company')), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS profiles(user_id INTEGER PRIMARY KEY REFERENCES users(id), education TEXT DEFAULT '', skills TEXT DEFAULT '', availability TEXT DEFAULT '', motivation TEXT DEFAULT '', city TEXT DEFAULT 'Gent', status TEXT DEFAULT 'new', review_reason TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS companies(id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id), name TEXT NOT NULL, sector TEXT DEFAULT '', city TEXT DEFAULT 'Gent', supervisor TEXT DEFAULT '', description TEXT DEFAULT '', status TEXT DEFAULT 'new', review_reason TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, company_id INTEGER REFERENCES companies(id), title TEXT NOT NULL, field TEXT NOT NULL, description TEXT NOT NULL, hours INTEGER NOT NULL, budget_confirmed INTEGER DEFAULT 0, status TEXT DEFAULT 'new', review_reason TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS matches(id INTEGER PRIMARY KEY, student_id INTEGER REFERENCES users(id), job_id INTEGER REFERENCES jobs(id), reason TEXT NOT NULL, student_decision TEXT DEFAULT 'pending', company_decision TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id,job_id));
    CREATE TABLE IF NOT EXISTS placements(id INTEGER PRIMARY KEY, match_id INTEGER UNIQUE REFERENCES matches(id), status TEXT DEFAULT 'active', start_date TEXT NOT NULL, end_date TEXT NOT NULL, work_package TEXT NOT NULL, employer_confirmed INTEGER NOT NULL, setup_cents INTEGER NOT NULL, monthly_cents INTEGER NOT NULL, stop_reason TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS goals(id INTEGER PRIMARY KEY, placement_id INTEGER REFERENCES placements(id), title TEXT NOT NULL, done INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS hours(id INTEGER PRIMARY KEY, placement_id INTEGER REFERENCES placements(id), date TEXT NOT NULL, amount REAL NOT NULL CHECK(amount>0 AND amount<=24), description TEXT NOT NULL, status TEXT DEFAULT 'submitted', review_note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY, placement_id INTEGER REFERENCES placements(id), author_id INTEGER REFERENCES users(id), body TEXT NOT NULL, kind TEXT DEFAULT 'feedback', due_date TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS portfolios(placement_id INTEGER PRIMARY KEY REFERENCES placements(id), title TEXT DEFAULT '', context TEXT DEFAULT '', contribution TEXT DEFAULT '', result TEXT DEFAULT '', reflection TEXT DEFAULT '', evidence TEXT DEFAULT '', version INTEGER DEFAULT 1, status TEXT DEFAULT 'draft', reviewed_version INTEGER, reviewer_id INTEGER REFERENCES users(id), review_note TEXT DEFAULT '', reviewed_at TEXT);
    CREATE TABLE IF NOT EXISTS charges(id INTEGER PRIMARY KEY, placement_id INTEGER REFERENCES placements(id), period TEXT NOT NULL, kind TEXT NOT NULL, amount_cents INTEGER NOT NULL, status TEXT DEFAULT 'draft', reference TEXT DEFAULT '', delivered INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(placement_id,period,kind));
    CREATE TABLE IF NOT EXISTS incidents(id INTEGER PRIMARY KEY, placement_id INTEGER REFERENCES placements(id), author_id INTEGER REFERENCES users(id), body TEXT NOT NULL, status TEXT DEFAULT 'open', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), setup_cents INTEGER DEFAULT 35000, monthly_cents INTEGER DEFAULT 19500, region TEXT DEFAULT 'Gent');
    INSERT OR IGNORE INTO settings(id) VALUES(1); PRAGMA user_version=1;`);
  return db;
}
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function seedDemo(db) {
  if (db.prepare("SELECT count(*) AS n FROM users").get().n) return;
  transaction(db, () => {
    db.prepare(
      "INSERT OR IGNORE INTO runtime_meta(key,value) VALUES('mode','demo')",
    ).run();
    const pass = hashPassword(randomBytes(32).toString("hex"));
    const users = [
      [1, "Bjarne De Meyere", "beheer@demo.stuard.local", "admin"],
      [2, "Lotte Vermeulen", "lotte@demo.stuard.local", "student"],
      [3, "Thomas De Smet", "thomas@demo.stuard.local", "company"],
      [4, "Yassin Peeters", "yassin@demo.stuard.local", "student"],
      [5, "Emma Willems", "emma@demo.stuard.local", "company"],
      [6, "Noor Jacobs", "noor@demo.stuard.local", "student"],
      [7, "Milan Claes", "milan@demo.stuard.local", "student"],
    ];
    for (const [id, name, email, role] of users)
      db.prepare(
        "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
      ).run(id, name, email, pass, role);
    for (const row of [
      [
        2,
        "Marketing · HOGENT",
        "Contentcreatie, sociale media",
        "Dinsdag en donderdag · 6 uur/week",
        "Leren schrijven voor een echt merk.",
        "qualified",
      ],
      [
        4,
        "Bedrijfsmanagement · Arteveldehogeschool",
        "CRM, Excel, klantencontact",
        "Woensdag · 8 uur/week",
        "Ervaring opdoen met klantenopvolging.",
        "qualified",
      ],
      [
        6,
        "Communicatiemanagement · Arteveldehogeschool",
        "Copywriting, fotografie",
        "Vrijdag · 4 uur/week",
        "Sterker worden in merkcommunicatie.",
        "new",
      ],
      [
        7,
        "Marketing · HOGENT",
        "Nieuwsbrieven, Canva",
        "Maandag · 6 uur/week",
        "Een contentplanning leren maken.",
        "qualified",
      ],
    ])
      db.prepare(
        "INSERT INTO profiles(user_id,education,skills,availability,motivation,status) VALUES(?,?,?,?,?,?)",
      ).run(...row);
    db.prepare(
      "INSERT INTO companies(id,user_id,name,sector,supervisor,description,status) VALUES(1,3,'Studio Noord','Design & interieur','Thomas De Smet','Een kleine interieurstudio met grote ideeën.','qualified'),(2,5,'Bloom Coffee','Retail & horeca','Emma Willems','Koffie, fijne gesprekken en lokale producten.','qualified')",
    ).run();
    for (const row of [
      [
        1,
        1,
        "Content die een verhaal vertelt",
        "Marketing & communicatie",
        "Bouw mee aan onze contentkalender en schrijf berichten over onze interieurprojecten.",
        6,
      ],
      [
        2,
        2,
        "Meer aandacht voor onze klanten",
        "Sales & klantenopvolging",
        "Breng structuur in onze klantenlijst en bereid opvolgmails voor.",
        8,
      ],
      [
        3,
        1,
        "Een frisse blik op onze nieuwsbrief",
        "Marketing & communicatie",
        "Werk mee aan de maandelijkse nieuwsbrief, onder begeleiding van Thomas.",
        4,
      ],
    ])
      db.prepare(
        "INSERT INTO jobs(id,company_id,title,field,description,hours,budget_confirmed,status) VALUES(?,?,?,?,?,?,1,'qualified')",
      ).run(...row);
    db.prepare(
      "INSERT INTO matches(id,student_id,job_id,reason,student_decision,company_decision) VALUES(1,2,1,'Lottes schrijfvaardigheid en beschikbaarheid sluiten aan bij de contentplanning.','accepted','accepted'),(2,4,2,'Yassin wil groeien in klantencontact en kan wekelijks een vaste dag meewerken.','accepted','accepted'),(3,7,3,'Milan heeft ervaring met nieuwsbrieven en zoekt een begeleide praktijkopdracht.','pending','pending')",
    ).run();
    const date = (offset) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    for (const [id, match, start, end, work] of [
      [
        1,
        1,
        -21,
        35,
        "Inventariseer de communicatie, maak een contentkalender en bereid acht berichten voor. Publicatie na controle.",
      ],
      [
        2,
        2,
        -7,
        49,
        "Werk klantgegevens bij en bereid opvolgmails voor. De begeleider controleert alle uitgaande communicatie.",
      ],
    ]) {
      db.prepare(
        "INSERT INTO placements(id,match_id,start_date,end_date,work_package,employer_confirmed,setup_cents,monthly_cents) VALUES(?,?,?,?,?,1,35000,19500)",
      ).run(id, match, date(start), date(end), work);
      for (const title of id === 1
        ? [
            "Een briefing vertalen naar heldere content",
            "Feedback verwerken in een volgende versie",
            "Een haalbare contentplanning maken",
          ]
        : [
            "Klantgegevens zorgvuldig registreren",
            "Een professionele opvolgmail schrijven",
          ])
        db.prepare("INSERT INTO goals(placement_id,title) VALUES(?,?)").run(
          id,
          title,
        );
      db.prepare("INSERT INTO portfolios(placement_id) VALUES(?)").run(id);
      db.prepare(
        "INSERT INTO notes(placement_id,author_id,body,kind,due_date) VALUES(?,1,?,?,?)",
      ).run(
        id,
        "Samen stilstaan bij de eerste resultaten en leerdoelen.",
        "checkin",
        date(id === 1 ? 2 : 4),
      );
    }
    db.prepare("UPDATE goals SET done=1 WHERE id=1").run();
    for (const [offset, amount, status] of [
      [-14, 4, "approved"],
      [-7, 6, "approved"],
      [-1, 3, "submitted"],
    ])
      db.prepare(
        "INSERT INTO hours(placement_id,date,amount,description,status) VALUES(1,?,?,?,?)",
      ).run(
        date(offset),
        amount,
        "Contentkalender en conceptteksten uitgewerkt.",
        status,
      );
    db.prepare(
      "INSERT INTO notes(placement_id,author_id,body) VALUES(1,3,'Je teksten sluiten steeds beter aan bij onze stijl. Neem bij de volgende ronde ook de doelgroep mee in je toelichting.')",
    ).run();
    db.prepare(
      "UPDATE portfolios SET title='Een herkenbaar verhaal voor Studio Noord',context='Studio Noord wil zijn interieurprojecten helder presenteren.',contribution='Ik maakte een contentkalender en schreef conceptteksten.',result='Een eerste contentplanning en vier gecontroleerde concepten.',reflection='Ik leerde hoe ik feedback op tone of voice verwerk.' WHERE placement_id=1",
    ).run();
  });
}
