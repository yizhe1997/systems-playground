import { defineConfig } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/auth";

// Starts nothing itself: it targets the composed stack (docker compose up -d) on the loopback address.
// One worker, in file order: the first spec expects an empty journal (scripts/test.sh gives it a fresh one).
export default defineConfig({
  testDir: "./e2e",
  // signs the browser in once, as the owner identity, with a cookie made without Google (feature 002, US4)
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3101",
    colorScheme: "light",
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
