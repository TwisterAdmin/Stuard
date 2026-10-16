import { openDatabase, seedDemo } from "./db.js";
import { createApp } from "./app.js";
import { resolve } from "node:path";
const demo = process.env.DEMO_MODE === "true";
if (process.env.NODE_ENV === "production" && demo) {
  console.error(
    "Demo mode is not permitted with NODE_ENV=production. Use a development/demo server or disable DEMO_MODE.",
  );
  process.exit(1);
}
const db = openDatabase(
  process.env.DATABASE_PATH ||
    resolve(demo ? ".data/demo.sqlite" : ".data/stuard.sqlite"),
);
db.exec(
  "CREATE TABLE IF NOT EXISTS runtime_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)",
);
const dbMode = db
  .prepare("SELECT value FROM runtime_meta WHERE key='mode'")
  .get()?.value;
const hasUsers = db.prepare("SELECT count(*) AS n FROM users").get().n > 0;
if ((demo && hasUsers && dbMode !== "demo") || (!demo && dbMode === "demo")) {
  console.error(
    "Database mode mismatch. Use a separate empty database for demo or real accounts.",
  );
  db.close();
  process.exit(1);
}
db.prepare(
  "INSERT OR IGNORE INTO runtime_meta(key,value) VALUES('mode',?)",
).run(demo ? "demo" : "real");
if (demo) seedDemo(db);
const app = createApp(db, {
  demo,
  secure:
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true",
});
const server = app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log(
    `Stuard API ready on port ${process.env.PORT || 3001}; demo=${demo}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
