import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { OWNER_EMAIL, cookieFor } from "./auth";
import { API, api, fillTrade, makeAccount, makeTrade, uniq } from "./helpers";

// Not a check: it captures the built screens of feature 003 (B1 to B8) for the visual review, in a folder outside the
// repository. Run it on a fresh stack:
//   CAPTURE_SCREENS=light npx playwright test e2e/zz-screens-agent.spec.ts   (and =dark)
// The token made here is a throwaway: it is revoked at the end, and nothing is written inside the repository.
const scheme = process.env.CAPTURE_SCREENS;
const out = process.env.CAPTURE_DIR ?? path.join(tmpdir(), "tradecraft-built", "003-backtest-accounts-and-agent-access");

test.skip(!scheme, "set CAPTURE_SCREENS=light or dark to capture the built screens");
test.use({ colorScheme: scheme === "dark" ? "dark" : "light", trace: "off", screenshot: "off", video: "off" });

async function shot(page: Page, name: string) {
  mkdirSync(out, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, `${name}-${scheme}.png`), fullPage: false });
}

test("capture", async ({ browser, page }) => {
  test.setTimeout(240_000);
  const live = await makeAccount(uniq("Funded 50K"), "USD", "17:00");
  const bt = await makeAccount(uniq("NQ ORB backtest 2024"), "USD", undefined, "backtest");
  await makeTrade(live.id, { instrument: "NQ" });
  await makeTrade(bt.id, { instrument: "NQ", entryAt: "2025-10-02T09:41", exitAt: "2025-10-02T09:58" });
  await makeTrade(bt.id, { instrument: "ES", entryAt: "2025-10-02T10:14", exitAt: "2025-10-02T10:31", direction: "short", exitPrice: "21460.00" });

  // B2 the list, B1 the form in its three states
  await page.goto("/accounts");
  await shot(page, "b2-accounts-list-kind");
  await page.getByRole("button", { name: "New account" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New account" });
  await expect(dialog).toBeVisible();
  await shot(page, "b1-account-form-new-live");
  await dialog.getByText("Backtest", { exact: true }).click();
  await shot(page, "b1-account-form-new-backtest");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Edit ${bt.name}` }).click();
  await page.getByRole("dialog", { name: "Edit account" }).getByText("Live", { exact: true }).click();
  await shot(page, "b1-account-form-changing-kind");
  await page.keyboard.press("Escape");

  // L2 the trade form: the preview says the entry was read (changed wording on an existing screen)
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: live.name, instrument: "NQ", direction: "Long", size: "2",
    entryPrice: "21450.00", entryDate: "2025-10-07", entryTime: "16:50",
    exitPrice: "21452.50", exitDate: "2025-10-07", exitTime: "17:10", dollarsPerPoint: "20", cost: "4.60", stopPrice: "21440.00",
  });
  await expect(page.getByRole("region", { name: "Result preview" })).toContainText("Tue 7 Oct 2025"); // the day, once the preview has answered
  await shot(page, "l2-log-a-trade-entry-read");

  // B3 reviews of a backtest
  await page.goto(`/reviews?account=${bt.id}&month=2025-10&open=2025-10-02`);
  await expect(page.getByText(/Backtest account: its days are never marked Missing/)).toBeVisible();
  await shot(page, "b3-reviews-of-a-backtest");

  // B4 the Trades list, off and on
  await page.goto("/trades?from=&to=");
  await shot(page, "b4-trades-show-backtests-off");
  await page.locator("label.switch", { hasText: "Show backtests" }).click();
  await expect(page).toHaveURL(/backtests=1/);
  await shot(page, "b4-trades-show-backtests-on");

  // B5 the counter with its chooser
  await page.goto("/mistakes");
  await shot(page, "b5-mistakes-all-live-accounts");

  // B6 the card: off, on with no tokens (only on a fresh journal), tokens
  await api("PUT", "/agent", { enabled: false });
  await page.goto("/settings");
  await shot(page, "b6-agent-access-off");
  await page.getByRole("region", { name: "Agent access" }).locator("label.switch").click();
  await expect(page.getByRole("button", { name: "New token" })).toBeVisible();
  await shot(page, "b6-agent-access-on");

  // B7 the dialog: name it, the error, the value shown once
  await page.getByRole("button", { name: "New token" }).click();
  const token = page.getByRole("dialog", { name: "New token" });
  await shot(page, "b7-new-token-name-it");
  await token.getByRole("button", { name: "Create token" }).click();
  await expect(token.getByText("! Name is required.")).toBeVisible();
  await shot(page, "b7-new-token-name-missing");
  // a token's name is unique for ever, so the night run (on the same stack) gets its own
  const tokenName = scheme === "dark" ? "Claude Desktop, backtests (night)" : "Claude Desktop, backtests";
  await token.getByLabel("Name").fill(tokenName);
  await token.getByRole("button", { name: "Create token" }).click();
  await expect(page.getByRole("dialog", { name: "Token created" })).toBeVisible();
  const value = await page.locator("#token-value").inputValue();
  await shot(page, "b7-new-token-shown-once");
  await page.getByRole("button", { name: "Done" }).click();
  await shot(page, "b6-agent-access-tokens");

  // B6 last frame: an older sign-in is asked to confirm with Google first
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, colorScheme: scheme === "dark" ? "dark" : "light", viewport: { width: 1440, height: 900 } });
  const now = Date.now();
  await context.addCookies([await cookieFor(OWNER_EMAIL, { sessionAt: now - 60_000, stepUpAt: now - 11 * 60_000 })]);
  const old = await context.newPage();
  await old.goto("/settings");
  await old.getByRole("region", { name: "Agent access" }).locator("label.switch").click();
  await expect(old.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
  await shot(old, "b6-agent-access-confirm-with-google");
  await context.close();

  // B8 agent rows: three reads and two refusals, made the way an agent would
  const door = (tok: string, name: string, args: Record<string, unknown>) =>
    fetch(API + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${tok}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
  await door(value, "list_accounts", {});
  await door(value, "list_trades", { accountId: bt.id });
  await door(value, "get_day", { accountId: bt.id, date: "2025-10-02" });
  await door("tca_" + "q".repeat(43), "list_accounts", {});
  const list = await api<{ tokens: { id: string; name: string }[] }>("GET", "/agent");
  const mine = list.data.tokens.find((t) => t.name === tokenName);
  if (mine) await api("POST", `/agent/tokens/${mine.id}/revoke`); // a throwaway: it ends the run revoked
  await door(value, "list_accounts", {}); // refused now, and named
  await page.goto("/audit");
  await shot(page, "b8-audit-log");
  await page.goto("/audit?kind=agent_token_created");
  await shot(page, "b8-audit-log-agent-token-created");
});
