import { defineConfig } from "@playwright/test";

// Starts nothing itself: it targets the composed stack (docker compose up -d) on the loopback address.
// One worker, in file order: the first spec expects an empty journal (scripts/test.sh gives it a fresh one).
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    colorScheme: "light",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
