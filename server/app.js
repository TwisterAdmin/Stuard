import express from "express";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { resolve } from "node:path";
import { hashPassword, verifyPassword, transaction } from "./db.js";

const text = z.string().trim().min(1).max(5000);
const short = z.string().trim().min(1).max(200);
const optional = z.string().trim().max(5000).default("");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Ongeldige datum",
  );
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const id = z.coerce.number().int().positive();
const digest = (v) => createHash("sha256").update(v).digest("hex");
const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
export function createApp(
  db,
  { demo = false, secure = false, staticDir = resolve("dist") } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (req.get("sec-fetch-site") === "cross-site")
        return res
          .status(403)
          .json({ error: "Verzoek van een andere website geweigerd." });
      if (origin) {
        try {
          if (new URL(origin).host !== req.get("host"))
            return res.status(403).json({ error: "Ongeldige oorsprong." });
        } catch {
          return res.status(403).json({ error: "Ongeldige oorsprong." });
        }
      }
      if (!req.is("application/json"))
        return res.status(415).json({ error: "JSON vereist." });
    }
    const token = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("stuard_session="))
      ?.slice(15);
    if (token)
      req.user = db
        .prepare(
          "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
        )
        .get(digest(token), Date.now());
    next();
  });
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const audit = (req, action, entity) =>
    run(
      "INSERT INTO audit(actor_id,action,entity_id) VALUES(?,?,?)",
      req.user.id,
      action,
      entity,
    );
  const auth = (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Log in om verder te gaan." });
    next();
  };
  const role =
    (...roles) =>
    (req, res, next) => {
      if (!roles.includes(req.user.role))
        return res
          .status(403)
          .json({ error: "Je hebt geen toegang tot deze actie." });
      next();
    };
  const session = (res, userId) => {
    const token = randomBytes(32).toString("hex");
    run("DELETE FROM sessions WHERE expires<?", Date.now());
    run(
      "INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)",
      digest(token),
      userId,
      Date.now() + 7 * 86400000,
    );
    res.cookie("stuard_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 7 * 86400000,
      path: "/",
    });
  };
  const companyFor = (user) =>
    get("SELECT * FROM companies WHERE user_id=?", user.id);
  const matchQuery = `SELECT m.*,u.name AS student_name,p.education,p.skills,p.availability,j.title,j.field,j.hours,j.description,j.budget_confirmed,j.status AS job_status,c.name AS company_name,c.id AS company_id,c.user_id AS company_user_id,c.supervisor FROM matches m JOIN users u ON u.id=m.student_id JOIN profiles p ON p.user_id=u.id JOIN jobs j ON j.id=m.job_id JOIN companies c ON c.id=j.company_id`;
  const placementQuery = `SELECT t.*,m.student_id,u.name AS student_name,j.title,j.field,j.hours AS weekly_hours,c.name AS company_name,c.user_id AS company_user_id,c.supervisor,c.city FROM placements t JOIN matches m ON m.id=t.match_id JOIN users u ON u.id=m.student_id JOIN jobs j ON j.id=m.job_id JOIN companies c ON c.id=j.company_id`;
  const accessible = (user, p) =>
    user.role === "admin" ||
    (user.role === "student" && p.student_id === user.id) ||
    (user.role === "company" && p.company_user_id === user.id);
  const placement = (req) => {
    const p = get(`${placementQuery} WHERE t.id=?`, id.parse(req.params.id));
    if (!p || !accessible(req.user, p)) fail(404, "Traject niet gevonden.");
    return p;
  };
  const active = (p) => {
    if (p.status !== "active")
      fail(409, "Deze actie kan alleen tijdens een actief traject.");
  };
  const loginAttempts = new Map();
  const limit = (req) => {
    const key = req.ip;
    const now = Date.now();
    for (const [k, v] of loginAttempts)
      if (v.until < now) loginAttempts.delete(k);
    const item = loginAttempts.get(key) || {
      count: 0,
      until: now + 15 * 60000,
    };
    item.count++;
    loginAttempts.set(key, item);
    if (item.count > 30)
      fail(429, "Te veel pogingen. Probeer over 15 minuten opnieuw.");
  };
  app.get("/api/health", (_req, res) =>
    res.json({ ok: !!get("SELECT 1 AS ok").ok }),
  );
  app.get("/api/meta", (_req, res) =>
    res.json({ demo, settings: get("SELECT * FROM settings WHERE id=1") }),
  );
  app.get("/api/me", auth, (req, res) => res.json(req.user));
  app.post("/api/auth/login", (req, res) => {
    limit(req);
    const data = z
      .object({
        email: z.string().email().max(200),
        password: z.string().min(1).max(200),
      })
      .parse(req.body);
    const user = get("SELECT * FROM users WHERE email=?", data.email);
    if (!user || !verifyPassword(data.password, user.password))
      fail(401, "E-mailadres of wachtwoord klopt niet.");
    session(res, user.id);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });
  app.post("/api/auth/register", (req, res) => {
    limit(req);
    const data = z
      .object({
        name: short,
        email: z.string().email().max(200),
        password: z.string().min(12, "Gebruik minstens 12 tekens.").max(200),
        role: z.enum(["student", "company"]),
        company_name: optional,
      })
      .parse(req.body);
    if (data.role === "company" && !data.company_name)
      fail(400, "Vul je bedrijfsnaam in.");
    if (get("SELECT id FROM users WHERE email=?", data.email))
      fail(409, "Dit e-mailadres is al in gebruik.");
    const userId = transaction(db, () => {
      const uid = Number(
        run(
          "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
          data.name,
          data.email,
          hashPassword(data.password),
          data.role,
        ).lastInsertRowid,
      );
      if (data.role === "student")
        run("INSERT INTO profiles(user_id) VALUES(?)", uid);
      else
        run(
          "INSERT INTO companies(user_id,name,supervisor) VALUES(?,?,?)",
          uid,
          data.company_name,
          data.name,
        );
      return uid;
    });
    session(res, userId);
    res
      .status(201)
      .json(get("SELECT id,name,email,role FROM users WHERE id=?", userId));
  });
  app.post("/api/auth/demo", (req, res) => {
    if (!demo) fail(404, "Niet beschikbaar.");
    const r = z.enum(["admin", "student", "company"]).parse(req.body.role);
    const user = get(
      "SELECT id,name,email,role FROM users WHERE role=? ORDER BY id LIMIT 1",
      r,
    );
    if (!user) fail(404, "Geen demoaccount gevonden.");
    session(res, user.id);
    res.json(user);
  });
  app.post("/api/auth/logout", (req, res) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("stuard_session="))
      ?.slice(15);
    if (token) run("DELETE FROM sessions WHERE token=?", digest(token));
    res.clearCookie("stuard_session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
    res.json({ ok: true });
  });
  app.use("/api", auth);
  app.get("/api/dashboard", (req, res) => {
    const placements = all(placementQuery).filter((p) =>
      accessible(req.user, p),
    );
    const matches = all(matchQuery).filter((p) => accessible(req.user, p));
    const ids = placements.map((p) => p.id);
    const hours = all("SELECT * FROM hours").filter((h) =>
      ids.includes(h.placement_id),
    );
    const upcoming = all(
      "SELECT n.*,t.end_date,u.name AS author FROM notes n JOIN placements t ON t.id=n.placement_id JOIN users u ON u.id=n.author_id WHERE n.kind=? ORDER BY n.due_date",
      "checkin",
    ).filter((n) => ids.includes(n.placement_id));
    const stats = {
      active: placements.filter((p) => p.status === "active").length,
      pending: matches
        .filter(
          (m) =>
            m.student_decision === "pending" ||
            m.company_decision === "pending",
        )
        .filter(
          (m) =>
            m.student_decision !== "rejected" &&
            m.company_decision !== "rejected",
        ).length,
      hours: hours
        .filter((h) => h.status === "approved")
        .reduce((a, h) => a + h.amount, 0),
      portfolios: all("SELECT * FROM portfolios").filter(
        (p) => ids.includes(p.placement_id) && p.status === "approved",
      ).length,
      students:
        req.user.role === "admin"
          ? get("SELECT count(*) AS n FROM profiles").n
          : null,
    };
    res.json({
      stats,
      placements: placements.map((p) => ({
        ...p,
        goals: all("SELECT * FROM goals WHERE placement_id=?", p.id),
      })),
      matches,
      upcoming,
      hours,
      incidents:
        req.user.role === "admin"
          ? all(
              "SELECT i.*,u.name AS author FROM incidents i JOIN users u ON u.id=i.author_id ORDER BY i.id DESC",
            )
          : [],
    });
  });
  app.get("/api/students", role("admin"), (_req, res) =>
    res.json(
      all(
        "SELECT u.id,u.name,u.email,p.* FROM users u JOIN profiles p ON p.user_id=u.id ORDER BY u.id DESC",
      ),
    ),
  );
  app.patch("/api/students/:id/review", role("admin"), (req, res) => {
    const data = z
      .object({ status: z.enum(["qualified", "deferred"]), reason: optional })
      .parse(req.body);
    if (data.status === "deferred" && !data.reason)
      fail(400, "Geef een reden voor het uitstellen.");
    if (!get("SELECT * FROM profiles WHERE user_id=?", id.parse(req.params.id)))
      fail(404, "Student niet gevonden.");
    run(
      "UPDATE profiles SET status=?,review_reason=? WHERE user_id=?",
      data.status,
      data.reason,
      +req.params.id,
    );
    audit(req, "student.review", +req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/profile", (req, res) =>
    res.json({
      user: req.user,
      profile:
        req.user.role === "student"
          ? get("SELECT * FROM profiles WHERE user_id=?", req.user.id)
          : req.user.role === "company"
            ? companyFor(req.user)
            : null,
    }),
  );
  app.put("/api/profile", (req, res) => {
    const data = z
      .object({
        name: short,
        education: optional,
        skills: optional,
        availability: optional,
        motivation: optional,
        city: short.default("Gent"),
        company_name: optional,
        sector: optional,
        supervisor: optional,
        description: optional,
      })
      .parse(req.body);
    if (req.user.role === "company" && (!data.company_name || !data.supervisor))
      fail(400, "Bedrijfsnaam en begeleider zijn verplicht.");
    transaction(db, () => {
      run("UPDATE users SET name=? WHERE id=?", data.name, req.user.id);
      if (req.user.role === "student")
        run(
          "UPDATE profiles SET education=?,skills=?,availability=?,motivation=?,city=?,status='new' WHERE user_id=?",
          data.education,
          data.skills,
          data.availability,
          data.motivation,
          data.city,
          req.user.id,
        );
      if (req.user.role === "company")
        run(
          "UPDATE companies SET name=?,sector=?,supervisor=?,description=?,city=?,status='new' WHERE user_id=?",
          data.company_name,
          data.sector,
          data.supervisor,
          data.description,
          data.city,
          req.user.id,
        );
    });
    res.json({ ok: true });
  });
  app.get("/api/companies", role("admin", "company"), (req, res) =>
    res.json(
      req.user.role === "admin"
        ? all("SELECT * FROM companies")
        : all("SELECT * FROM companies WHERE user_id=?", req.user.id),
    ),
  );
  app.get("/api/jobs", role("admin", "company"), (req, res) =>
    res.json(
      all(
        "SELECT j.*,c.name AS company_name,c.supervisor,c.user_id FROM jobs j JOIN companies c ON c.id=j.company_id",
      ).filter((j) => req.user.role === "admin" || j.user_id === req.user.id),
    ),
  );
  app.post("/api/jobs", role("admin", "company"), (req, res) => {
    const data = z
      .object({
        company_id: id.optional(),
        title: short,
        field: z.enum(["Marketing & communicatie", "Sales & klantenopvolging"]),
        description: text,
        hours: z.number().int().min(1).max(20),
        budget_confirmed: z.boolean(),
      })
      .parse(req.body);
    const cid =
      req.user.role === "company" ? companyFor(req.user)?.id : data.company_id;
    if (!cid || !get("SELECT id FROM companies WHERE id=?", cid))
      fail(400, "Kies een bedrijf.");
    const result = run(
      "INSERT INTO jobs(company_id,title,field,description,hours,budget_confirmed) VALUES(?,?,?,?,?,?)",
      cid,
      data.title,
      data.field,
      data.description,
      data.hours,
      +data.budget_confirmed,
    );
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  app.patch("/api/jobs/:id/review", role("admin"), (req, res) => {
    const data = z
      .object({ status: z.enum(["qualified", "deferred"]), reason: optional })
      .parse(req.body);
    const job = get("SELECT * FROM jobs WHERE id=?", id.parse(req.params.id));
    if (!job) fail(404, "Opdracht niet gevonden.");
    if (data.status === "deferred" && !data.reason)
      fail(400, "Geef een reden voor het uitstellen.");
    if (
      data.status === "qualified" &&
      (!job.budget_confirmed ||
        !get("SELECT supervisor FROM companies WHERE id=?", job.company_id)
          .supervisor)
    )
      fail(409, "Budgetakkoord en een begeleider zijn nodig.");
    run(
      "UPDATE jobs SET status=?,review_reason=? WHERE id=?",
      data.status,
      data.reason,
      job.id,
    );
    res.json({ ok: true });
  });
  app.get("/api/matches", (req, res) =>
    res.json(
      all(matchQuery)
        .filter((m) => accessible(req.user, m))
        .map((m) => ({
          ...m,
          placement_id: get("SELECT id FROM placements WHERE match_id=?", m.id)
            ?.id,
        })),
    ),
  );
  app.post("/api/matches", role("admin"), (req, res) => {
    const data = z
      .object({ student_id: id, job_id: id, reason: text })
      .parse(req.body);
    if (
      get("SELECT status FROM profiles WHERE user_id=?", data.student_id)
        ?.status !== "qualified" ||
      get("SELECT status FROM jobs WHERE id=?", data.job_id)?.status !==
        "qualified"
    )
      fail(409, "Kwalificeer eerst de student en de opdracht.");
    if (
      get(
        "SELECT id FROM matches WHERE student_id=? AND job_id=?",
        data.student_id,
        data.job_id,
      )
    )
      fail(409, "Deze combinatie is al voorgesteld.");
    const result = run(
      "INSERT INTO matches(student_id,job_id,reason) VALUES(?,?,?)",
      data.student_id,
      data.job_id,
      data.reason,
    );
    audit(req, "match.propose", Number(result.lastInsertRowid));
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  app.post(
    "/api/matches/:id/decision",
    role("student", "company"),
    (req, res) => {
      const m = get(`${matchQuery} WHERE m.id=?`, id.parse(req.params.id));
      if (!m || !accessible(req.user, m)) fail(404, "Match niet gevonden.");
      if (get("SELECT id FROM placements WHERE match_id=?", m.id))
        fail(409, "Dit traject is al gestart.");
      if (
        m.student_decision === "rejected" ||
        m.company_decision === "rejected"
      )
        fail(409, "Deze match is afgewezen.");
      const decision = z
        .enum(["accepted", "rejected"])
        .parse(req.body.decision);
      const column =
        req.user.role === "student" ? "student_decision" : "company_decision";
      run(`UPDATE matches SET ${column}=? WHERE id=?`, decision, m.id);
      audit(req, "match." + decision, m.id);
      res.json({ ok: true });
    },
  );
  app.post("/api/matches/:id/start", role("admin"), (req, res) => {
    const data = z
      .object({
        start_date: date,
        end_date: date,
        work_package: text,
        goals: z.array(short).min(2).max(3),
        employer_confirmed: z.literal(true),
        terms_confirmed: z.literal(true),
      })
      .parse(req.body);
    const m = get(`${matchQuery} WHERE m.id=?`, id.parse(req.params.id));
    if (!m) fail(404, "Match niet gevonden.");
    if (m.student_decision !== "accepted" || m.company_decision !== "accepted")
      fail(409, "Student en bedrijf moeten allebei akkoord zijn.");
    if (!m.budget_confirmed || !m.supervisor)
      fail(409, "Budget en begeleider ontbreken.");
    if (data.end_date <= data.start_date)
      fail(400, "De einddatum moet na de startdatum liggen.");
    if (get("SELECT id FROM placements WHERE match_id=?", m.id))
      fail(409, "Deze match heeft al een traject.");
    const settings = get("SELECT * FROM settings WHERE id=1");
    const pid = transaction(db, () => {
      const pid = Number(
        run(
          "INSERT INTO placements(match_id,start_date,end_date,work_package,employer_confirmed,setup_cents,monthly_cents) VALUES(?,?,?,?,1,?,?)",
          m.id,
          data.start_date,
          data.end_date,
          data.work_package,
          settings.setup_cents,
          settings.monthly_cents,
        ).lastInsertRowid,
      );
      for (const goal of data.goals)
        run("INSERT INTO goals(placement_id,title) VALUES(?,?)", pid, goal);
      run("INSERT INTO portfolios(placement_id) VALUES(?)", pid);
      const week = new Date(data.start_date);
      week.setUTCDate(week.getUTCDate() + 7);
      run(
        "INSERT INTO notes(placement_id,author_id,body,kind,due_date) VALUES(?,?,?,'checkin',?)",
        pid,
        req.user.id,
        "Eerste-weekcontact met student en begeleider.",
        week.toISOString().slice(0, 10),
      );
      run(
        "INSERT INTO notes(placement_id,author_id,body,kind,due_date) VALUES(?,?,?,'checkin',?)",
        pid,
        req.user.id,
        "Eindevaluatie en bespreken van afronding of verlenging.",
        data.end_date,
      );
      audit(req, "placement.start", pid);
      return pid;
    });
    res.status(201).json({ id: pid });
  });
  app.get("/api/placements", (req, res) =>
    res.json(
      all(placementQuery)
        .filter((p) => accessible(req.user, p))
        .map((p) => ({
          ...p,
          goals: all("SELECT * FROM goals WHERE placement_id=?", p.id),
        })),
    ),
  );
  app.get("/api/placements/:id", (req, res) => {
    const p = placement(req);
    res.json({
      ...p,
      goals: all("SELECT * FROM goals WHERE placement_id=?", p.id),
      hours: all(
        "SELECT * FROM hours WHERE placement_id=? ORDER BY date DESC,id DESC",
        p.id,
      ),
      notes: all(
        "SELECT n.*,u.name AS author FROM notes n JOIN users u ON u.id=n.author_id WHERE n.placement_id=? ORDER BY n.id DESC",
        p.id,
      ),
      portfolio: get(
        "SELECT p.*,u.name AS reviewer FROM portfolios p LEFT JOIN users u ON u.id=p.reviewer_id WHERE placement_id=?",
        p.id,
      ),
    });
  });
  app.patch("/api/placements/:id/status", role("admin"), (req, res) => {
    const p = placement(req);
    const data = z
      .object({
        status: z.enum(["active", "paused", "completed", "stopped"]),
        reason: text,
      })
      .parse(req.body);
    const transitions = {
      active: ["paused", "completed", "stopped"],
      paused: ["active", "stopped", "completed"],
    };
    if (!transitions[p.status]?.includes(data.status))
      fail(409, "Deze statusovergang is niet mogelijk.");
    transaction(db, () => {
      run(
        "UPDATE placements SET status=?,stop_reason=? WHERE id=?",
        data.status,
        data.reason,
        p.id,
      );
      run(
        "INSERT INTO notes(placement_id,author_id,body,kind) VALUES(?,?,?,?)",
        p.id,
        req.user.id,
        data.reason,
        "status",
      );
      audit(req, "placement." + data.status, p.id);
    });
    res.json({ ok: true });
  });
  app.patch("/api/placements/:id/extend", role("admin"), (req, res) => {
    const p = placement(req);
    if (!["active", "paused"].includes(p.status))
      fail(409, "Alleen lopende trajecten kunnen worden verlengd.");
    const data = z
      .object({ end_date: date, reason: text, both_confirmed: z.literal(true) })
      .parse(req.body);
    if (data.end_date <= p.end_date) fail(400, "Kies een latere einddatum.");
    transaction(db, () => {
      run("UPDATE placements SET end_date=? WHERE id=?", data.end_date, p.id);
      run(
        "INSERT INTO notes(placement_id,author_id,body,kind,due_date) VALUES(?,?,?,'checkin',?)",
        p.id,
        req.user.id,
        "Verlenging bevestigd: " + data.reason,
        data.end_date,
      );
      audit(req, "placement.extend", p.id);
    });
    res.json({ ok: true });
  });
  app.patch(
    "/api/placements/:id/goals/:goalId",
    role("company", "admin"),
    (req, res) => {
      const p = placement(req);
      active(p);
      const done = z.boolean().parse(req.body.done);
      const result = run(
        "UPDATE goals SET done=? WHERE id=? AND placement_id=?",
        +done,
        id.parse(req.params.goalId),
        p.id,
      );
      if (!result.changes) fail(404, "Leerdoel niet gevonden.");
      res.json({ ok: true });
    },
  );
  app.post("/api/placements/:id/hours", role("student"), (req, res) => {
    const p = placement(req);
    active(p);
    const data = z
      .object({
        date,
        amount: z.number().min(0.25).max(24).multipleOf(0.25),
        description: text,
      })
      .parse(req.body);
    if (
      data.date < p.start_date ||
      data.date > p.end_date ||
      data.date > new Date().toISOString().slice(0, 10)
    )
      fail(
        400,
        "Kies een gewerkte dag binnen je traject, niet in de toekomst.",
      );
    const total = get(
      "SELECT coalesce(sum(h.amount),0) AS n FROM hours h JOIN placements p ON p.id=h.placement_id JOIN matches m ON m.id=p.match_id WHERE m.student_id=? AND h.date=? AND h.status<>?",
      req.user.id,
      data.date,
      "rejected",
    ).n;
    if (total + data.amount > 24)
      fail(400, "Je kunt maximaal 24 uur per dag registreren.");
    run(
      "INSERT INTO hours(placement_id,date,amount,description) VALUES(?,?,?,?)",
      p.id,
      data.date,
      data.amount,
      data.description,
    );
    res.status(201).json({ ok: true });
  });
  app.patch(
    "/api/placements/:id/hours/:hourId",
    role("company"),
    (req, res) => {
      const p = placement(req);
      const data = z
        .object({
          status: z.enum(["approved", "rejected"]),
          review_note: optional,
        })
        .parse(req.body);
      if (data.status === "rejected" && !data.review_note)
        fail(400, "Geef een reden voor afwijzing.");
      const h = get(
        "SELECT * FROM hours WHERE id=? AND placement_id=?",
        id.parse(req.params.hourId),
        p.id,
      );
      if (!h) fail(404, "Uren niet gevonden.");
      if (h.status !== "submitted") fail(409, "Deze uren zijn al beoordeeld.");
      run(
        "UPDATE hours SET status=?,review_note=? WHERE id=?",
        data.status,
        data.review_note,
        h.id,
      );
      audit(req, "hours." + data.status, h.id);
      res.json({ ok: true });
    },
  );
  app.post("/api/placements/:id/notes", (req, res) => {
    const p = placement(req);
    const data = z
      .object({
        body: text,
        kind: z.enum(["feedback", "checkin"]).default("feedback"),
        due_date: z.union([date, z.literal("")]).default(""),
      })
      .parse(req.body);
    if (data.kind === "checkin" && req.user.role !== "admin")
      fail(403, "Alleen Stuard plant opvolgmomenten.");
    if (data.kind === "checkin" && !data.due_date)
      fail(400, "Een datum is verplicht.");
    run(
      "INSERT INTO notes(placement_id,author_id,body,kind,due_date) VALUES(?,?,?,?,?)",
      p.id,
      req.user.id,
      data.body,
      data.kind,
      data.due_date,
    );
    res.status(201).json({ ok: true });
  });
  app.put("/api/placements/:id/portfolio", role("student"), (req, res) => {
    const p = placement(req);
    const data = z
      .object({
        title: short,
        context: text,
        contribution: text,
        result: text,
        reflection: text,
        evidence: optional,
      })
      .parse(req.body);
    run(
      "UPDATE portfolios SET title=?,context=?,contribution=?,result=?,reflection=?,evidence=?,version=version+1,status='draft',reviewed_version=NULL,reviewer_id=NULL,reviewed_at=NULL,review_note='' WHERE placement_id=?",
      data.title,
      data.context,
      data.contribution,
      data.result,
      data.reflection,
      data.evidence,
      p.id,
    );
    res.json({ ok: true });
  });
  app.post(
    "/api/placements/:id/portfolio/submit",
    role("student"),
    (req, res) => {
      const p = placement(req);
      const port = get("SELECT * FROM portfolios WHERE placement_id=?", p.id);
      if (!["draft", "changes_requested"].includes(port.status))
        fail(409, "Deze versie is al ingediend.");
      if (
        !port.title ||
        !port.context ||
        !port.contribution ||
        !port.result ||
        !port.reflection
      )
        fail(400, "Vul eerst alle onderdelen van je case in.");
      run(
        "UPDATE portfolios SET status='submitted' WHERE placement_id=?",
        p.id,
      );
      res.json({ ok: true });
    },
  );
  app.post(
    "/api/placements/:id/portfolio/review",
    role("company"),
    (req, res) => {
      const p = placement(req);
      const data = z
        .object({
          status: z.enum(["approved", "changes_requested"]),
          version: id,
          review_note: optional,
          sharing_checked: z.boolean().default(false),
        })
        .parse(req.body);
      const port = get("SELECT * FROM portfolios WHERE placement_id=?", p.id);
      if (port.status !== "submitted" || port.version !== data.version)
        fail(
          409,
          "Deze versie kan niet worden beoordeeld. Vernieuw de pagina.",
        );
      if (data.status === "approved" && !data.sharing_checked)
        fail(400, "Controleer eerst vertrouwelijkheid en gebruiksrechten.");
      if (data.status === "changes_requested" && !data.review_note)
        fail(400, "Omschrijf de gewenste wijziging.");
      run(
        "UPDATE portfolios SET status=?,reviewed_version=?,reviewer_id=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE placement_id=?",
        data.status,
        port.version,
        req.user.id,
        data.review_note,
        p.id,
      );
      audit(req, "portfolio." + data.status, p.id);
      res.json({ ok: true });
    },
  );
  app.get("/api/placements/:id/portfolio/export", (req, res) => {
    const p = placement(req);
    const port = get(
      "SELECT p.*,u.name AS reviewer FROM portfolios p JOIN users u ON u.id=p.reviewer_id WHERE placement_id=?",
      p.id,
    );
    if (
      !port ||
      port.status !== "approved" ||
      port.reviewed_version !== port.version
    )
      fail(409, "Alleen een goedgekeurde versie kan worden geëxporteerd.");
    const content = `STUARD — PORTFOLIO\n${port.title}\n\nStudent: ${p.student_name}\nBedrijf: ${p.company_name}\nPeriode: ${p.start_date} – ${p.end_date}\n\nContext\n${port.context}\n\nEigen bijdrage\n${port.contribution}\n\nResultaat\n${port.result}\n\nReflectie\n${port.reflection}\n\nBewijsbeschrijving\n${port.evidence}\n\nBevestigd door ${port.reviewer} op ${port.reviewed_at}, versie ${port.version}.\nDit bevestigt de beschreven bijdrage; het is geen academische erkenning.\n`;
    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="stuard-portfolio-${p.id}-v${port.version}.txt"`,
    });
    res.send(content);
  });
  app.get("/api/charges", role("admin", "company"), (req, res) =>
    res.json(
      all(
        "SELECT ch.*,c.name AS company_name,c.user_id AS company_user_id,u.name AS student_name FROM charges ch JOIN placements p ON p.id=ch.placement_id JOIN matches m ON m.id=p.match_id JOIN jobs j ON j.id=m.job_id JOIN companies c ON c.id=j.company_id JOIN users u ON u.id=m.student_id ORDER BY ch.id DESC",
      ).filter(
        (c) => req.user.role === "admin" || c.company_user_id === req.user.id,
      ),
    ),
  );
  app.post("/api/charges", role("admin"), (req, res) => {
    const data = z
      .object({
        placement_id: id,
        kind: z.enum(["setup", "monthly"]),
        period,
        delivered: z.literal(true),
      })
      .parse(req.body);
    const p = get("SELECT * FROM placements WHERE id=?", data.placement_id);
    if (!p) fail(404, "Traject niet gevonden.");
    if (
      data.period < p.start_date.slice(0, 7) ||
      data.period > p.end_date.slice(0, 7) ||
      data.period > new Date().toISOString().slice(0, 7)
    )
      fail(400, "Kies een verstreken of lopende maand binnen het traject.");
    if (
      data.kind === "setup" &&
      get("SELECT id FROM charges WHERE placement_id=? AND kind='setup'", p.id)
    )
      fail(409, "De opstart is al geregistreerd.");
    if (
      get(
        "SELECT id FROM charges WHERE placement_id=? AND kind=? AND period=?",
        p.id,
        data.kind,
        data.period,
      )
    )
      fail(409, "Deze dienstverleningsregel bestaat al.");
    run(
      "INSERT INTO charges(placement_id,period,kind,amount_cents,delivered) VALUES(?,?,?,?,1)",
      p.id,
      data.period,
      data.kind,
      data.kind === "setup" ? p.setup_cents : p.monthly_cents,
    );
    audit(req, "charge.create", p.id);
    res.status(201).json({ ok: true });
  });
  app.patch("/api/charges/:id", role("admin"), (req, res) => {
    const data = z
      .object({ status: z.enum(["invoiced", "paid"]), reference: short })
      .parse(req.body);
    const charge = get(
      "SELECT * FROM charges WHERE id=?",
      id.parse(req.params.id),
    );
    if (!charge) fail(404, "Regel niet gevonden.");
    if (!(
      (charge.status === "draft" && data.status === "invoiced") ||
      (charge.status === "invoiced" && data.status === "paid")
    ))
      fail(409, "Deze statusovergang is niet mogelijk.");
    run(
      "UPDATE charges SET status=?,reference=? WHERE id=?",
      data.status,
      data.reference,
      charge.id,
    );
    audit(req, "charge." + data.status, charge.id);
    res.json({ ok: true });
  });
  app.post("/api/placements/:id/incidents", (req, res) => {
    const p = placement(req);
    const body = text.parse(req.body.body);
    run(
      "INSERT INTO incidents(placement_id,author_id,body) VALUES(?,?,?)",
      p.id,
      req.user.id,
      body,
    );
    res.status(201).json({ ok: true });
  });
  app.patch("/api/incidents/:id", role("admin"), (req, res) => {
    const status = z.enum(["open", "resolved"]).parse(req.body.status);
    if (
      !run(
        "UPDATE incidents SET status=? WHERE id=?",
        status,
        id.parse(req.params.id),
      ).changes
    )
      fail(404, "Melding niet gevonden.");
    audit(req, "incident." + status, +req.params.id);
    res.json({ ok: true });
  });
  app.put("/api/settings", role("admin"), (req, res) => {
    const data = z
      .object({
        setup_cents: z.number().int().min(0).max(10000000),
        monthly_cents: z.number().int().min(0).max(10000000),
        region: short,
      })
      .parse(req.body);
    run(
      "UPDATE settings SET setup_cents=?,monthly_cents=?,region=? WHERE id=1",
      data.setup_cents,
      data.monthly_cents,
      data.region,
    );
    audit(req, "settings.update", 1);
    res.json({ ok: true });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Niet gevonden." }),
  );
  app.use(express.static(staticDir));
  app.get("/{*path}", (_req, res, next) =>
    res.sendFile(resolve(staticDir, "index.html"), (e) => e && next(e)),
  );
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" · "),
      });
    const status = error.status || 500;
    if (status === 500) console.error("Request failed:", error.message);
    res.status(status).json({
      error:
        status === 500 ? "Er ging iets mis. Probeer opnieuw." : error.message,
    });
  });
  return app;
}
