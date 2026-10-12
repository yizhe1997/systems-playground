import { expect, test } from "@playwright/test";
import { fillTrade, hasNoAccounts, makeAccount, makeTrade, preview, tradesFor, uniq } from "./helpers";

test("first run: no account, then an account, then a trade A with its figures worked out (SC-001)", async ({ page }) => {
  test.skip(!(await hasNoAccounts()), "needs an empty journal; scripts/test.sh gives each run a fresh one");

  await page.goto("/trades");
  await expect(page.getByText("Create an account first.")).toBeVisible();
  await expect(page.getByText("Log a trade").first()).toHaveAttribute("aria-disabled", "true");

  // account
  await page.getByRole("link", { name: "New account" }).click();
  const dialog = page.getByRole("dialog", { name: "New account" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill("Funded 50K");
  await dialog.getByLabel(/Trading-day start/).fill("17:00");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: /Funded 50K/ })).toContainText("17:00");

  // trade
  await page.goto("/trades");
  const started = Date.now();
  await page.getByRole("link", { name: "Log a trade" }).first().click();
  await expect(page.getByRole("heading", { name: "Log a trade" })).toBeVisible();
  await expect(page.getByLabel("Account", { exact: true })).toHaveValue(/.+/); // the only account is preselected
  await fillTrade(page, {
    instrument: "NQ", direction: "Long", size: "2",
    entryPrice: "21450.00", entryDate: "2025-10-01", entryTime: "09:41",
    exitPrice: "21452.50", exitDate: "2025-10-01", exitTime: "09:58",
    dollarsPerPoint: "20", cost: "4.60", stopPrice: "21440.00",
  });
  const p = preview(page);
  await expect(p).toContainText("+$100.00");
  await expect(p).toContainText("-$4.60");
  await expect(p).toContainText("+$95.40");
  await expect(p).toContainText("$400.00");
  await expect(p).toContainText("+0.24 R");
  await expect(p).toContainText("Wed 1 Oct 2025");
  await expect(p).toContainText("entry read in Central Time; Funded 50K starts its trading day at 17:00");
  await page.getByRole("button", { name: "Save trade" }).click();

  // back on the list, on the month of the trade
  await expect(page).toHaveURL(/\/trades\?from=2025-10-01&to=2025-10-31/);
  const row = page.getByRole("row", { name: /NQ/ });
  await expect(row).toContainText("+$95.40");
  await expect(row).toContainText("+0.24 R");
  await expect(row).toContainText("Wed 1 Oct 09:41"); // the entry first, then the exit
  await expect(row).toContainText("Wed 1 Oct 09:58");
  expect(Date.now() - started, "from opening the form to the trade in the list").toBeLessThan(60_000);
});

test("trade B has no stop: a dash with its reason; the list has no totals", async ({ page }) => {
  const acct = await makeAccount(uniq("B"));
  await makeTrade(acct.id, { instrument: "ES", direction: "short", size: "1", entryPrice: "5300", exitPrice: "5298", dollarsPerPoint: "50", cost: "2.10", stopPrice: null });
  await page.goto(tradesFor(acct.id));
  const row = page.getByRole("row", { name: /ES/ });
  await expect(row).toContainText("+$97.90");
  await expect(row).toContainText("no stop recorded");
  await expect(page.getByText("Each result is in its own account's currency. This list has no totals.")).toBeVisible();
});

test("the form shows the wireframe errors and keeps what was typed", async ({ page }) => {
  const acct = await makeAccount(uniq("D"));
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: acct.name, instrument: "", direction: "Long", size: "0",
    entryPrice: "21450", entryDate: "2025-10-01", entryTime: "10:00",
    exitPrice: "21452", exitDate: "2025-10-01", exitTime: "09:00", dollarsPerPoint: "20",
  });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText("3 things to fix before this trade can be saved.")).toBeVisible();
  await expect(page.getByText("Fix the fields marked with a !.")).toBeVisible();
  await expect(page.getByText("! Instrument is required.")).toBeVisible();
  await expect(page.getByText("! Size must be above zero.")).toBeVisible();
  await expect(page.getByText("! Exit must not be earlier than the entry.")).toBeVisible();
  await expect(page.getByLabel("Entry price")).toHaveValue("21450");
  // typing in a field clears its message
  await page.getByLabel("Instrument").fill("NQ");
  await expect(page.getByText("! Instrument is required.")).toBeHidden();
});

test("number and time messages", async ({ page }) => {
  const acct = await makeAccount(uniq("N"));
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: acct.name, instrument: "NQ", direction: "Long", size: "1,5",
    entryPrice: "1.123456789", entryDate: "2025-10-01", entryTime: "09:00",
    exitPrice: "2", exitDate: "2035-01-01", exitTime: "10:00", dollarsPerPoint: "20",
  });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText("! Enter a number with a point for decimals, for example 21450.25.")).toBeVisible();
  await expect(page.getByText("! At most 8 decimal places.")).toBeVisible();
  await expect(page.getByText("! Times cannot be in the future.")).toBeVisible();
});

test("leaving a changed form asks first; Keep editing stays", async ({ page }) => {
  await makeAccount(uniq("L"));
  await page.goto("/trades/new");
  await page.getByLabel("Instrument").fill("NQ");
  await page.getByRole("link", { name: "Accounts" }).click();
  const prompt = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(prompt).toContainText("Your changes will be lost.");
  await prompt.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/trades\/new/);
  await expect(page.getByLabel("Instrument")).toHaveValue("NQ");
  await page.getByRole("link", { name: "Accounts" }).click();
  await page.getByRole("dialog", { name: "Leave without saving?" }).getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/accounts/);
});

test("the time field takes ISO or the screen style, and shows the screen style", async ({ page }) => {
  const acct = await makeAccount(uniq("Time"));
  await page.goto("/trades/new");
  const entry = page.getByLabel(/Entry time \(/);
  await entry.fill("2025-10-01 09:41");
  await entry.blur();
  await expect(entry).toHaveValue("Wed 1 Oct 2025 09:41");
  await fillTrade(page, { account: acct.name, instrument: "TM1", direction: "Long", size: "1", entryPrice: "10", exitPrice: "11", dollarsPerPoint: "5" });
  await page.getByLabel(/Exit time \(/).fill("Thu 1 Oct 2025 09:50"); // the weekday does not match
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText("! That weekday does not match the date.")).toBeVisible();
  await page.getByLabel(/Exit time \(/).fill("Wed 1 Oct 2025 09:50");
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\?from=2025-10-01/);
  await page.goto(tradesFor(acct.id));
  await page.getByRole("link", { name: /Edit TM1/ }).click();
  await expect(page.getByLabel(/Entry time \(/)).toHaveValue("Wed 1 Oct 2025 09:41");
});
