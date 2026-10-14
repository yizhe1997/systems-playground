import { expect, test } from "@playwright/test";
import { gotoAccount, makeAccount, makeTrade, tradesFor, uniq, rowAction } from "./helpers";

test("edit dialog: notices, name already used, start 00:00 refused, rename saved", async ({ page }) => {
  const taken = await makeAccount(uniq("Taken"));
  const mine = await makeAccount(uniq("Mine"));
  await gotoAccount(page, mine.name);
  await rowAction(page, mine.name, "Edit");
  const dialog = page.getByRole("dialog", { name: "Edit account" });
  await expect(dialog).toContainText("Changing the start time moves this account's trades to the right trading days.");
  await expect(dialog).toContainText("Changing the currency only changes the label. Existing results are not converted.");

  await dialog.getByLabel("Name").fill(taken.name.toLowerCase());
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toContainText(`! An account named ${taken.name} already exists. Names are not case sensitive.`);

  await dialog.getByLabel("Name").fill(mine.name);
  await dialog.getByLabel(/Trading-day start/).fill("00:00");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toContainText("! Start time cannot be 00:00. Leave it empty to use the calendar date of each entry.");

  await dialog.getByLabel(/Trading-day start/).fill("18:30");
  await dialog.getByLabel("Name").fill(mine.name + " renamed");
  await dialog.getByLabel("Currency").selectOption("EUR");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();
  await gotoAccount(page, mine.name + " renamed"); // the new name sorts to its own place in the list
  const row = page.getByRole("row", { name: new RegExp(mine.name + " renamed") });
  await expect(row).toContainText("EUR");
  await expect(row).toContainText("18:30");
});

test("Escape closes the dialog and focus stays inside while it is open", async ({ page }) => {
  await page.goto("/accounts");
  await page.getByRole("button", { name: "New account" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New account" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    // focus may rest on the browser's own chrome (body) but never on the page behind the dialog
    expect(await dialog.evaluate((d) => d.contains(document.activeElement) || document.activeElement === document.body)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("archive with Undo, Show archived, Restore; trades of an archived account stay", async ({ page }) => {
  const acct = await makeAccount(uniq("Arch"));
  await makeTrade(acct.id, { instrument: "AR1" });
  await gotoAccount(page, acct.name);
  await rowAction(page, acct.name, "Archive");
  await expect(page.getByText("Account archived.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(acct.name) })).toBeHidden();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("row", { name: new RegExp(acct.name) })).toBeVisible();

  await rowAction(page, acct.name, "Archive");
  await expect(page.getByRole("row", { name: new RegExp(acct.name) })).toBeHidden();
  await gotoAccount(page, acct.name, "archived=1");
  await expect(page.getByText("Archived accounts keep all their trades. Restore one to use it again.")).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(acct.name) });
  await expect(row).toContainText("Archived");

  // its trades are still on the trades list
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /AR1/ })).toBeVisible();

  await gotoAccount(page, acct.name, "archived=1");
  await page.getByRole("button", { name: `Restore ${acct.name}` }).click();
  await expect(page.getByRole("button", { name: `Actions for ${acct.name}` })).toBeVisible();
});

test("the account chooser of a new trade leaves out archived accounts", async ({ page }) => {
  const live = await makeAccount(uniq("Live"));
  const gone = await makeAccount(uniq("Gone"));
  await gotoAccount(page, gone.name);
  await rowAction(page, gone.name, "Archive");
  await expect(page.getByText("Account archived.")).toBeVisible();
  await page.goto("/trades/new");
  const options = await page.getByLabel("Account", { exact: true }).locator("option").allTextContents();
  expect(options).toContain(live.name);
  expect(options).not.toContain(gone.name);
});

test("Archive account from the edit dialog", async ({ page }) => {
  const acct = await makeAccount(uniq("DlgArch"));
  await gotoAccount(page, acct.name);
  await rowAction(page, acct.name, "Edit");
  await page.getByRole("dialog").getByRole("button", { name: "Archive account" }).click();
  await expect(page.getByText("Account archived.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(acct.name) })).toBeHidden();
});
