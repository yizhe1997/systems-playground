import { expect, test } from "@playwright/test";
import { gotoAccount, api, makeAccount, makeTrade, uniq, rowAction } from "./helpers";

/** An instrument name no earlier run has used, so a row can be found by it alone. */
const inst = (prefix: string) => `${prefix}${Date.now().toString(36).toUpperCase()}`;

// Feature 003, user story 1 (screens B1 to B5): a backtest account is kept apart from live trading.

test("B1 and B2: make a Backtest account in the dialog; the list marks it and says what the kind means", async ({ page }) => {
  const name = uniq("BT dialog");
  await page.goto("/accounts");
  await page.getByRole("button", { name: "New account" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New account" });
  await expect(dialog.getByRole("radio", { name: "Live" })).toBeChecked();
  await expect(dialog).toContainText("Counts in your reviews, trades and mistake counter.");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByText("Backtest", { exact: true }).click();
  await expect(dialog).toContainText("Kept apart from live trading: its days are never Missing, and it stays out of live figures until you choose it.");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();

  await gotoAccount(page, name); // the list is paged and sorted by name
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Backtest");
  await expect(page.getByText("Backtest accounts are marked in every account chooser and left out of live figures until you choose them.")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Kind" })).toBeVisible();
});

test("B3: a backtest day is never Missing; a live day with the same trade is", async ({ page }) => {
  const live = await makeAccount(uniq("Live B3"));
  const bt = await makeAccount(uniq("BT B3"), "USD", undefined, "backtest");
  await makeTrade(live.id, { instrument: "LB3" });
  await makeTrade(bt.id, { instrument: "BB3" });

  await page.goto(`/reviews?account=${live.id}&month=2025-10&open=2025-10-01`);
  await expect(page.getByRole("link", { name: /^Missing [1-9]/ })).toBeVisible();
  await expect(page.getByText(/Backtest account: its days are never marked Missing/)).toBeHidden();

  await page.goto(`/reviews?account=${bt.id}&month=2025-10&open=2025-10-01`);
  await expect(page.getByText("Backtest account: its days are never marked Missing and nothing here changes your live figures.")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Missing/ })).toHaveCount(0);
  await expect(page.getByText(/\d+ missing/)).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Account" }).locator("option:checked")).toHaveText(`${bt.name} (Backtest)`);
  // the day shows a dash where a live day would show Missing
  await expect(page.locator(".day-row").first()).toContainText("—");
  await expect(page.locator(".day-row").first()).not.toContainText("Missing");
  // a week with no trades has nothing to review, so it does not say "Not reviewed"
  const empty = page.locator(".week-card", { hasText: "No days to review yet" });
  await expect(empty.first()).toBeVisible();
  await expect(empty.filter({ hasText: "Not reviewed" })).toHaveCount(0);
});

test("B4: the Trades list is live only until Show backtests is on or the backtest account is chosen", async ({ page }) => {
  const live = await makeAccount(uniq("Live B4"));
  const bt = await makeAccount(uniq("BT B4"), "USD", undefined, "backtest");
  const liveInst = inst("LIV"), btInst = inst("BCK");
  // a day no other test uses, so the two trades are on the first page of the list of every account
  const day = { entryAt: "2024-03-15T09:00", exitAt: "2024-03-15T09:30" };
  await makeTrade(live.id, { instrument: liveInst, ...day });
  await makeTrade(bt.id, { instrument: btInst, ...day });

  await page.goto("/trades?from=2024-03-15&to=2024-03-15");
  await expect(page.getByRole("row", { name: new RegExp(liveInst) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(btInst) })).toHaveCount(0);
  await expect(page.getByText(/Backtests are hidden; turn on Show backtests or choose a backtest account\./)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Exit time" })).toBeVisible();

  await page.locator("label.switch", { hasText: "Show backtests" }).click();
  await expect(page).toHaveURL(/backtests=1/);
  const row = page.getByRole("row", { name: new RegExp(btInst) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Backtest");
  await expect(page.getByText(/backtests included\./)).toBeVisible();
  // every column and the actions fit a 1440 px window (a long account name wraps instead of widening the table)
  expect(await page.locator(".table-wrap").first().evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

  // choosing the account shows its trades without the switch
  await page.goto("/trades?from=&to=");
  await page.getByLabel("Account").selectOption({ label: `${bt.name} (Backtest)` });
  await expect(page.getByRole("row", { name: new RegExp(btInst) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(liveInst) })).toHaveCount(0);
});

test("B5: the counter's all-accounts means live accounts, and backtests are listed in their own group", async ({ page }) => {
  const bt = await makeAccount(uniq("BT B5"), "USD", undefined, "backtest");
  await page.goto("/mistakes");
  const chooser = page.getByLabel("Account");
  await expect(chooser.locator("option").first()).toHaveText("All live accounts");
  await expect(chooser.locator("optgroup[label='Backtests'] option", { hasText: `${bt.name} (Backtest)` })).toHaveCount(1);
  await expect(page.getByText("Counting live accounts only. Choose a backtest account to count its mistakes on their own.")).toBeVisible();
});

test("changing the kind shows the notice, moves the account, is recorded, and the export carries the kind", async ({ page }) => {
  const acct = await makeAccount(uniq("Flip"), "USD", undefined, "backtest");
  const flipInst = inst("FLP");
  await makeTrade(acct.id, { instrument: flipInst, entryAt: "2024-03-16T09:00", exitAt: "2024-03-16T09:30" }); // a day no other test uses
  await gotoAccount(page, acct.name);
  await rowAction(page, acct.name, "Edit");
  const dialog = page.getByRole("dialog", { name: "Edit account" });
  await expect(dialog.getByRole("radio", { name: "Backtest" })).toBeChecked();
  await expect(dialog).not.toContainText("Changing the kind moves this account's days and trades");
  await dialog.getByText("Live", { exact: true }).click();
  await expect(dialog).toContainText("Changing the kind moves this account's days and trades in or out of live figures. Nothing you typed changes.");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();

  // now live: its trade is on the default Trades list
  await page.goto("/trades?from=2024-03-16&to=2024-03-16");
  await expect(page.getByRole("row", { name: new RegExp(flipInst) })).toBeVisible();

  const log = await api("GET", "/audit?kind=account_kind_changed");
  expect(JSON.stringify(log.data)).toContain(acct.name);
  const exp = await api("GET", "/export");
  const exported = (exp.data.accounts as { name: string; kind: string }[]).find((a) => a.name === acct.name);
  expect(exported?.kind).toBe("live");
});
