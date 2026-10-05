import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { api, fillTrade, makeAccount, makeTrade, tradeA, tradesFor } from "./helpers";

// Not a check: it captures the built screens for the visual review (a folder outside the repository, see CAPTURE_DIR).
// Run on a fresh stack:  CAPTURE_SCREENS=light npx playwright test e2e/zz-screens.spec.ts   (and =dark)
// The first two screens need an empty journal, so run it on one.
const scheme = process.env.CAPTURE_SCREENS;
const out = process.env.CAPTURE_DIR ?? path.join(tmpdir(), "tradecraft-built", "000-log-trades"); // outside the repository: screenshots are never committed

test.skip(!scheme, "set CAPTURE_SCREENS=light or dark to capture the built screens");
test.use({ colorScheme: scheme === "dark" ? "dark" : "light" });

async function shot(page: Page, name: string) {
  mkdirSync(out, { recursive: true });
  await page.waitForTimeout(250); // let the preview settle
  await page.screenshot({ path: path.join(out, `${name}-${scheme}.png`), fullPage: false });
}

test("could not load (run with the API stopped: CAPTURE_DOWN=1)", async ({ page }) => {
  test.skip(process.env.CAPTURE_DOWN !== "1", "needs the API stopped");
  await page.goto("/trades");
  await expect(page.getByText("! Could not reach the journal.")).toBeVisible();
  await shot(page, "l1-could-not-load");
});

test("capture", async ({ page }) => {
  test.skip(process.env.CAPTURE_DOWN === "1", "the API is stopped for this run");
  test.setTimeout(180_000);
  // --- an empty journal
  await page.goto("/trades");
  await expect(page.getByText("Create an account first.")).toBeVisible();
  await shot(page, "l1-no-accounts-yet");
  await page.goto("/accounts");
  await expect(page.getByText("No accounts yet.")).toBeVisible();
  await shot(page, "l3-accounts-none-yet");

  // --- accounts
  const funded = await makeAccount("Funded 50K", "USD", "17:00");
  await page.goto("/trades?from=&to=");
  await expect(page.getByText("No trades yet.")).toBeVisible();
  await shot(page, "l1-no-trades-at-all");

  const practice = await makeAccount("Practice", "USD");
  const swing = await makeAccount("Swing EUR", "EUR");
  const old = await makeAccount("Old demo", "USD");

  // --- trades (the sample data of the wireframes)
  await makeTrade(funded.id, { instrument: "ES", direction: "short", size: "1", entryPrice: "5300", exitPrice: "5302.5", entryAt: "2025-10-01T10:40", exitAt: "2025-10-01T10:52", dollarsPerPoint: "50", cost: "0", stopPrice: "5305" });
  await makeTrade(funded.id, { instrument: "NQ", direction: "long", size: "2", entryPrice: "21500", exitPrice: "21488", entryAt: "2025-10-01T10:10", exitAt: "2025-10-01T10:31", dollarsPerPoint: "20", cost: "0", stopPrice: null });
  await makeTrade(funded.id, { instrument: "NQ", direction: "long", size: "2", entryAt: "2025-10-01T09:41", exitAt: "2025-10-01T09:58" });
  await makeTrade(funded.id, { instrument: "NQ", direction: "long", size: "1", entryPrice: "21500", exitPrice: "21502.75", entryAt: "2025-09-30T17:10", exitAt: "2025-09-30T17:30", dollarsPerPoint: "20", cost: "0", stopPrice: "21490" });
  await makeTrade(funded.id, { instrument: "ES", direction: "long", size: "1", entryPrice: "5300", exitPrice: "5298", entryAt: "2025-09-30T13:50", exitAt: "2025-09-30T14:20", dollarsPerPoint: null, cost: "0", stopPrice: null, typedResult: "-80.00" });
  await makeTrade(practice.id, { instrument: "NQ", direction: "short", size: "1", entryPrice: "21500", exitPrice: "21493.5", entryAt: "2025-09-30T10:40", exitAt: "2025-09-30T11:05", dollarsPerPoint: "20", cost: "0", stopPrice: "21510" });
  await makeTrade(swing.id, { instrument: "FDAX", direction: "long", size: "1", entryPrice: "24000", exitPrice: "24010", entryAt: "2025-09-29T09:00", exitAt: "2025-09-29T15:00", dollarsPerPoint: "25", cost: "3.2", stopPrice: "23980" });
  const doomed = await makeTrade(funded.id, { instrument: "YM", direction: "long", size: "1", entryPrice: "46000", exitPrice: "45990", entryAt: "2025-09-26T10:00", exitAt: "2025-09-26T10:30", dollarsPerPoint: "5", cost: "1", stopPrice: "45950" });
  await api("DELETE", `/trades/${doomed.id}`);
  await api("POST", `/accounts/${old.id}/archive`);

  // L1
  await page.goto("/trades?from=&to=");
  await expect(page.getByRole("row", { name: /FDAX/ })).toBeVisible();
  await shot(page, "l1-trades-list-filled");
  await page.goto(`/trades?account=${funded.id}&from=2025-01-01&to=2025-01-31`);
  await expect(page.getByText("No trades for these filters.")).toBeVisible();
  await shot(page, "l1-filters-match-nothing");
  await page.goto("/trades?from=&to=&deleted=1");
  await expect(page.getByText("Showing deleted trades.")).toBeVisible();
  await shot(page, "l1-showing-deleted");
  await page.goto("/trades?from=&to=");
  await page.getByRole("button", { name: /Delete NQ long trade of Wed 1 Oct 09:58/ }).click();
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  await shot(page, "l1-trade-deleted-undo");
  await page.getByRole("button", { name: "Undo" }).click();

  // L2 new, filled, typed result, errors
  await page.goto("/trades/new");
  await shot(page, "l2-log-a-trade-new");
  await fillTrade(page, { account: "Funded 50K", instrument: "NQ", direction: "Long", size: "2", entryPrice: "21450.00", entryDate: "2025-10-01", entryTime: "09:41", exitPrice: "21452.50", exitDate: "2025-10-01", exitTime: "09:58", dollarsPerPoint: "20", cost: "4.60", stopPrice: "21440.00", thesis: "Opening range break with volume, first push after the open." });
  await expect(page.getByRole("region", { name: "Result preview" })).toContainText("+0.24 R");
  await shot(page, "l2-log-a-trade-filled");
  await page.getByLabel(/Dollars per point/).fill("");
  await page.getByLabel(/Result after costs/).fill("-120.00");
  await expect(page.getByRole("region", { name: "Result preview" })).toContainText("typed in");
  await shot(page, "l2-dollars-per-point-blank");

  await page.goto("/trades/new");
  await fillTrade(page, { account: "Funded 50K", instrument: "", direction: "Long", size: "0", entryPrice: "21450", entryDate: "2025-10-01", entryTime: "10:00", exitPrice: "21452", exitDate: "2025-10-01", exitTime: "09:00", dollarsPerPoint: "20" });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText("3 things to fix before this trade can be saved.")).toBeVisible();
  await shot(page, "l2-validation-errors");

  // could not save (the journal cannot be reached) and changed elsewhere, both from the same filled form
  await page.goto("/trades/new");
  await fillTrade(page, { account: "Funded 50K", instrument: "NQ", direction: "Long", size: "2", entryPrice: "21450.00", entryDate: "2025-10-01", entryTime: "09:41", exitPrice: "21452.50", exitDate: "2025-10-01", exitTime: "09:58", dollarsPerPoint: "20", cost: "4.60" });
  await page.route("**/api/trades", (route) => (route.request().method() === "POST" && !route.request().url().includes("preview") ? route.fulfill({ status: 502, json: { code: "unreachable", message: "Could not reach the journal." } }) : route.fallback()));
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText(/Nothing was saved/)).toBeVisible();
  await shot(page, "l2-could-not-save");
  await page.unroute("**/api/trades");

  await page.getByText("Long", { exact: true }).click(); // a change, so leaving asks
  await page.getByRole("link", { name: "Accounts" }).click();
  await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toBeVisible();
  await shot(page, "l2-leave-without-saving");
  await page.getByRole("button", { name: "Leave" }).click();

  // L2 edit and changed elsewhere
  const t = await makeTrade(funded.id, { instrument: "NQ", entryAt: "2025-10-01T09:41", exitAt: "2025-10-01T09:58", thesis: "Opening range break with volume, first push after the open." });
  await page.goto(`/trades/${t.id}/edit`);
  await shot(page, "l2-edit-a-trade");
  await api("PUT", `/trades/${t.id}`, { ...tradeA(funded.id), instrument: "NQ", expectedUpdatedAt: t.updatedAt });
  await page.getByLabel("Size", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/changed elsewhere/)).toBeVisible();
  await shot(page, "l2-changed-elsewhere");

  // L3, L4
  await page.goto("/accounts");
  await shot(page, "l3-accounts-list");
  await page.goto("/accounts?archived=1");
  await expect(page.getByText("Archived accounts keep all their trades.")).toBeVisible();
  await shot(page, "l3-showing-archived");
  await page.goto("/accounts");
  await page.getByRole("button", { name: "New account" }).first().click();
  await shot(page, "l4-account-dialog-new");
  await page.getByRole("dialog").getByLabel("Name").fill("funded 50k");
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(page.getByText(/already exists/)).toBeVisible();
  await shot(page, "l4-name-already-used");
  await page.getByRole("dialog").getByLabel("Name").fill("Another account");
  await page.getByRole("dialog").getByLabel(/Trading-day start/).fill("00:00");
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(page.getByText(/Start time cannot be 00:00/)).toBeVisible();
  await shot(page, "l4-start-time-0000");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit Funded 50K" }).click();
  await shot(page, "l4-account-dialog-edit");
  await page.keyboard.press("Escape");

  // L5
  await page.goto("/settings");
  await expect(page.getByText("Current time in this zone:")).toContainText(/\d{2}:\d{2}/);
  await shot(page, "l5-settings-time-zone");
  void tradesFor;
});
