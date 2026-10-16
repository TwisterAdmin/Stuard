import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "stuard-e2e-"));
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3101",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node server/index.js",
    url: "http://127.0.0.1:3101/api/health",
    env: {
      DEMO_MODE: "true",
      NODE_ENV: "test",
      PORT: "3101",
      DATABASE_PATH: join(dir, "browser.sqlite"),
    },
    reuseExistingServer: false,
    timeout: 20000,
  },
});
