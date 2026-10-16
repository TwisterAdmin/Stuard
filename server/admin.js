import { openDatabase, hashPassword } from "./db.js";
const {
  ADMIN_NAME: name,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
} = process.env;
if (!name || !email || !password || password.length < 12) {
  console.error(
    "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) securely in the process environment.",
  );
  process.exit(1);
}
const db = openDatabase();
if (
  db.prepare("SELECT value FROM runtime_meta WHERE key='mode'").get()?.value ===
  "demo"
) {
  console.error("Use a separate database for real administrator accounts.");
  db.close();
  process.exit(1);
}
db.prepare(
  "INSERT OR IGNORE INTO runtime_meta(key,value) VALUES('mode','real')",
).run();
if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) {
  console.error("Account already exists; no changes made.");
  process.exitCode = 1;
} else {
  db.prepare(
    "INSERT INTO users(name,email,password,role) VALUES(?,?,?,'admin')",
  ).run(name, email, hashPassword(password));
  console.log("Administrator created.");
}
db.close();
