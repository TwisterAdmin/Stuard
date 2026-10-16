import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import {
  openDatabase,
  seedDemo,
  hashPassword,
  verifyPassword,
} from "../server/db.js";

let db, server, base;
beforeEach(async () => {
  db = openDatabase(":memory:");
  seedDemo(db);
  server = createApp(db, { demo: true }).listen(0, "127.0.0.1");
  await once(server, "listening");
  base = "http://127.0.0.1:" + server.address().port;
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});
async function request(
  path,
  { method = "GET", body, cookie, headers = {} } = {},
) {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const type = response.headers.get("content-type") || "";
  return {
    status: response.status,
    body: type.includes("application/json")
      ? await response.json()
      : await response.text(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    headers: response.headers,
  };
}
async function login(role) {
  const result = await request("/auth/demo", {
    method: "POST",
    body: { role },
  });
  assert.equal(result.status, 200);
  return result.cookie;
}
const write = (cookie, path, body, method = "POST") =>
  request(path, { cookie, method, body });
const register = (role, name) =>
  request("/auth/register", {
    method: "POST",
    body: {
      name,
      email: name.toLowerCase() + "@test.invalid",
      password: "A-valid-test-password-2026",
      role,
      company_name: role === "company" ? name + " Studio" : "",
    },
  });
const now = () => new Date().toISOString().slice(0, 10);

test("passwords are salted, verified and never stored in plaintext", () => {
  const a = hashPassword("A-strong-password"),
    b = hashPassword("A-strong-password");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("A-strong-password", a), true);
  assert.equal(verifyPassword("wrong", a), false);
});
test("private endpoints require a session; registration cannot create administrators", async () => {
  assert.equal((await request("/dashboard")).status, 401);
  assert.equal((await register("admin", "Intruder")).status, 400);
  const c = await register("student", "Newstudent");
  assert.equal(c.status, 201);
  assert.match(c.headers.get("set-cookie"), /HttpOnly/);
  assert.match(c.headers.get("set-cookie"), /SameSite=Lax/);
  assert.equal((await request("/students", { cookie: c.cookie })).status, 403);
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: {
          name: "Short",
          email: "short@test.invalid",
          password: "tiny",
          role: "student",
        },
      })
    ).status,
    400,
  );
});
test("login works and logout invalidates the server session", async () => {
  await register("student", "Loginuser");
  const result = await write(null, "/auth/login", {
    email: "loginuser@test.invalid",
    password: "A-valid-test-password-2026",
  });
  assert.equal(result.status, 200);
  assert.equal(
    (await request("/me", { cookie: result.cookie })).body.name,
    "Loginuser",
  );
  await write(result.cookie, "/auth/logout", {});
  assert.equal((await request("/me", { cookie: result.cookie })).status, 401);
  assert.equal(
    (
      await write(null, "/auth/login", {
        email: "loginuser@test.invalid",
        password: "not-the-password",
      })
    ).status,
    401,
  );
});
test("rejects cross-origin mutations and non-JSON requests", async () => {
  const c = await login("admin");
  assert.equal(
    (
      await write(
        c,
        "/settings",
        { region: "Gent", setup_cents: 1, monthly_cents: 1 },
        "PUT",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/settings", {
        method: "PUT",
        cookie: c,
        body: {},
        headers: { origin: "https://untrusted.invalid" },
      })
    ).status,
    403,
  );
  assert.equal((await request("/auth/demo", { method: "POST" })).status, 415);
});
test("companies and students cannot read other trajectories or administrative data", async () => {
  const company = await login("company"),
    student = await login("student");
  assert.equal(
    (await request("/placements/2", { cookie: company })).status,
    404,
  );
  assert.equal(
    (await request("/placements/2", { cookie: student })).status,
    404,
  );
  assert.equal((await request("/students", { cookie: company })).status, 403);
  assert.equal((await request("/charges", { cookie: student })).status, 403);
  const d = (await request("/dashboard", { cookie: company })).body;
  assert.ok(d.placements.every((p) => p.company_user_id === 3));
  assert.ok(d.matches.every((m) => m.company_user_id === 3));
  assert.deepEqual(d.incidents, []);
  assert.ok(!JSON.stringify(d).includes("Bloom Coffee"));
});
test("full intake, qualification, independent matching decisions and start checklist", async () => {
  const admin = await login("admin"),
    s = await register("student", "Intakestudent"),
    c = await register("company", "Intakecompany");
  assert.equal(
    (
      await write(
        s.cookie,
        "/profile",
        {
          name: "Intakestudent",
          education: "Marketing",
          skills: "Copywriting",
          availability: "Tuesday",
          motivation: "Leren schrijven",
          city: "Gent",
        },
        "PUT",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(
        c.cookie,
        "/profile",
        {
          name: "Intakecompany",
          company_name: "New Studio",
          supervisor: "Els",
          city: "Gent",
          description: "Marketing support",
          sector: "Design",
        },
        "PUT",
      )
    ).status,
    200,
  );
  const job = await write(c.cookie, "/jobs", {
    title: "Een nieuwe opdracht",
    field: "Marketing & communicatie",
    description: "Schrijf onder begeleiding",
    hours: 6,
    budget_confirmed: true,
  });
  assert.equal(job.status, 201);
  assert.equal(
    (
      await write(admin, "/matches", {
        student_id: s.body.id,
        job_id: job.body.id,
        reason: "Vaardigheden en beschikbaarheid passen.",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await write(
        admin,
        "/students/" + s.body.id + "/review",
        { status: "qualified" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(
        admin,
        "/jobs/" + job.body.id + "/review",
        { status: "qualified" },
        "PATCH",
      )
    ).status,
    200,
  );
  const match = await write(admin, "/matches", {
    student_id: s.body.id,
    job_id: job.body.id,
    reason: "Vaardigheden en beschikbaarheid passen.",
  });
  assert.equal(match.status, 201);
  const start = {
    start_date: "2026-10-01",
    end_date: "2026-11-26",
    work_package: "Content opstellen",
    goals: ["Schrijven", "Feedback verwerken"],
    employer_confirmed: true,
    terms_confirmed: true,
  };
  assert.equal(
    (await write(admin, "/matches/" + match.body.id + "/start", start)).status,
    409,
  );
  assert.equal(
    (
      await write(s.cookie, "/matches/" + match.body.id + "/decision", {
        decision: "accepted",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await write(admin, "/matches/" + match.body.id + "/decision", {
        decision: "accepted",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await write(c.cookie, "/matches/" + match.body.id + "/decision", {
        decision: "accepted",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await write(admin, "/matches/" + match.body.id + "/start", {
        ...start,
        employer_confirmed: false,
      })
    ).status,
    400,
  );
  const p = await write(admin, "/matches/" + match.body.id + "/start", start);
  assert.equal(p.status, 201);
  assert.equal(
    (await write(admin, "/matches/" + match.body.id + "/start", start)).status,
    409,
  );
  const detail = (
    await request("/placements/" + p.body.id, { cookie: s.cookie })
  ).body;
  assert.equal(detail.goals.length, 2);
  assert.equal(detail.notes.filter((n) => n.kind === "checkin").length, 2);
  assert.equal(detail.setup_cents, 35000);
});
test("hours validation, ownership and employer review are enforced", async () => {
  const student = await login("student"),
    company = await login("company");
  const day = now();
  assert.equal(
    (
      await write(student, "/placements/1/hours", {
        date: day,
        amount: 4,
        description: "Content gemaakt",
      })
    ).status,
    201,
  );
  const hours = (await request("/placements/1", { cookie: student })).body
    .hours;
  const h = hours.find((h) => h.date === day);
  assert.equal(
    (
      await write(
        student,
        "/placements/1/hours/" + h.id,
        { status: "approved" },
        "PATCH",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await write(
        company,
        "/placements/1/hours/" + h.id,
        { status: "approved" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(
        company,
        "/placements/1/hours/" + h.id,
        { status: "approved" },
        "PATCH",
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await write(student, "/placements/1/hours", {
        date: day,
        amount: 21,
        description: "Te veel",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await write(student, "/placements/2/hours", {
        date: day,
        amount: 1,
        description: "Ander traject",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await write(student, "/placements/1/hours", {
        date: "2026-02-30",
        amount: 1,
        description: "Ongeldige datum",
      })
    ).status,
    400,
  );
});
test("pause blocks new hours; extension preserves trajectory and frozen prices", async () => {
  const admin = await login("admin"),
    student = await login("student");
  assert.equal(
    (
      await write(
        admin,
        "/placements/1/status",
        { status: "paused", reason: "Examens" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(student, "/placements/1/hours", {
        date: now(),
        amount: 2,
        description: "Werk",
      })
    ).status,
    409,
  );
  await write(
    admin,
    "/settings",
    { region: "Gent", setup_cents: 40000, monthly_cents: 20000 },
    "PUT",
  );
  assert.equal(
    (
      await write(
        admin,
        "/placements/1/extend",
        {
          end_date: "2027-03-01",
          reason: "Samen verder",
          both_confirmed: true,
        },
        "PATCH",
      )
    ).status,
    200,
  );
  let p = (await request("/placements/1", { cookie: admin })).body;
  assert.equal(p.setup_cents, 35000);
  assert.equal(p.monthly_cents, 19500);
  assert.equal(p.id, 1);
  assert.equal(
    (
      await write(
        admin,
        "/placements/1/status",
        { status: "completed", reason: "Afgerond" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(
        admin,
        "/placements/1/status",
        { status: "active", reason: "Heropenen" },
        "PATCH",
      )
    ).status,
    409,
  );
});
test("portfolio review is version-bound, private and export remains available after completion", async () => {
  const student = await login("student"),
    company = await login("company"),
    admin = await login("admin");
  const content = {
    title: "Mijn bijdrage",
    context: "Context",
    contribution: "Eigen werk",
    result: "Vier teksten",
    reflection: "Leren van feedback",
    evidence: "Goedgekeurde beschrijving",
  };
  assert.equal(
    (await request("/placements/1/portfolio/export", { cookie: student }))
      .status,
    409,
  );
  await write(student, "/placements/1/portfolio", content, "PUT");
  await write(student, "/placements/1/portfolio/submit", {});
  const version = (await request("/placements/1", { cookie: company })).body
    .portfolio.version;
  assert.equal(
    (
      await write(student, "/placements/1/portfolio/review", {
        status: "approved",
        version,
        sharing_checked: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await write(company, "/placements/1/portfolio/review", {
        status: "approved",
        version,
        sharing_checked: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await write(company, "/placements/1/portfolio/review", {
        status: "approved",
        version: version - 1,
        sharing_checked: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await write(company, "/placements/1/portfolio/review", {
        status: "approved",
        version,
        sharing_checked: true,
      })
    ).status,
    200,
  );
  await write(
    admin,
    "/placements/1/status",
    { status: "completed", reason: "Werk afgerond" },
    "PATCH",
  );
  const exported = await request("/placements/1/portfolio/export", {
    cookie: student,
  });
  assert.equal(exported.status, 200);
  assert.match(exported.body, /Eigen werk/);
  assert.match(exported.headers.get("content-disposition"), /attachment/);
  await write(
    student,
    "/placements/1/portfolio",
    { ...content, result: "Gewijzigde resultaten" },
    "PUT",
  );
  assert.equal(
    (await request("/placements/1/portfolio/export", { cookie: student }))
      .status,
    409,
  );
});
test("service charges need delivery confirmation and cannot duplicate setup or month", async () => {
  const admin = await login("admin"),
    student = await login("student");
  const period = now().slice(0, 7),
    charge = { placement_id: 1, period, kind: "monthly", delivered: true };
  assert.equal(
    (await write(admin, "/charges", { ...charge, delivered: false })).status,
    400,
  );
  assert.equal((await write(admin, "/charges", charge)).status, 201);
  assert.equal((await write(admin, "/charges", charge)).status, 409);
  assert.equal((await write(student, "/charges", charge)).status, 403);
  assert.equal(
    (await write(admin, "/charges", { ...charge, kind: "setup" })).status,
    201,
  );
  assert.equal(
    (await write(admin, "/charges", { ...charge, kind: "setup" })).status,
    409,
  );
  const id = (await request("/charges", { cookie: admin })).body[0].id;
  assert.equal(
    (
      await write(
        admin,
        "/charges/" + id,
        { status: "paid", reference: "F-001" },
        "PATCH",
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await write(
        admin,
        "/charges/" + id,
        { status: "invoiced", reference: "F-001" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await write(
        admin,
        "/charges/" + id,
        { status: "paid", reference: "F-001" },
        "PATCH",
      )
    ).status,
    200,
  );
});
test("incident reports are visible only to Stuard, not the employer", async () => {
  const student = await login("student"),
    company = await login("company"),
    admin = await login("admin");
  await write(student, "/placements/1/incidents", {
    body: "Een vertrouwelijke melding",
  });
  assert.equal(
    (await request("/dashboard", { cookie: company })).body.incidents.length,
    0,
  );
  const incidents = (await request("/dashboard", { cookie: admin })).body
    .incidents;
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].body, "Een vertrouwelijke melding");
  assert.equal(
    (
      await write(
        company,
        "/incidents/" + incidents[0].id,
        { status: "resolved" },
        "PATCH",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await write(
        admin,
        "/incidents/" + incidents[0].id,
        { status: "resolved" },
        "PATCH",
      )
    ).status,
    200,
  );
});
test("database content and schema survive reopen; seeding never overwrites records", () => {
  const folder = mkdtempSync(join(tmpdir(), "stuard-db-")),
    path = join(folder, "test.sqlite");
  try {
    let persistent = openDatabase(path);
    seedDemo(persistent);
    persistent
      .prepare("UPDATE profiles SET motivation=? WHERE user_id=2")
      .run("Persist this");
    persistent.close();
    persistent = openDatabase(path);
    seedDemo(persistent);
    assert.equal(
      persistent
        .prepare("SELECT motivation FROM profiles WHERE user_id=2")
        .get().motivation,
      "Persist this",
    );
    assert.equal(
      persistent.prepare("SELECT count(*) AS n FROM placements").get().n,
      2,
    );
    assert.equal(
      persistent.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    persistent.close();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
test("demo login is disabled unless explicitly enabled", async () => {
  const isolated = createApp(db, { demo: false }).listen(0, "127.0.0.1");
  await once(isolated, "listening");
  try {
    const res = await fetch(
      "http://127.0.0.1:" + isolated.address().port + "/api/auth/demo",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      },
    );
    assert.equal(res.status, 404);
  } finally {
    await new Promise((resolve) => isolated.close(resolve));
  }
});
