import { expect, test } from "@playwright/test";
import { fillTrade, makeAccount, preview, tradesFor, uniq } from "./helpers";

test("clear dollars per point: the typed result appears, the preview shows dashes with reasons; add it back and the result is computed", async ({ page }) => {
  const acct = await makeAccount(uniq("Typed"));
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: acct.name, instrument: "TY1", direction: "Long", size: "1",
    entryPrice: "5300", entryDate: "2025-10-01", entryTime: "09:00",
    exitPrice: "5298", exitDate: "2025-10-01", exitTime: "09:30",
  });
  // dollars per point is blank from the start
  await expect(page.getByText("Leave blank to type the result")).toBeVisible();
  await expect(page.getByLabel(/Result after costs \(required\)/)).toBeVisible();
  const p = preview(page);
  await expect(p).toContainText("needs prices, size and dollars per point");
  await expect(p).toContainText("not used");
  await expect(p).toContainText("a typed result is already after costs");

  await page.getByLabel(/Result after costs/).fill("-120.00");
  await expect(p).toContainText("-$120.00");
  await expect(p).toContainText("typed in");
  await expect(p).toContainText("needs a net result and a risk");

  // saving without the result says why
  await page.getByLabel(/Result after costs/).fill("");
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText("! Result is required while dollars per point is blank.")).toBeVisible();

  // add dollars per point: the typed field goes away and the result is computed
  await fillTrade(page, { dollarsPerPoint: "50", cost: "2" });
  await expect(page.getByLabel(/Result after costs/)).toBeHidden();
  await expect(p).toContainText("-$102.00"); // (5298 - 5300) x 1 x 50 = -100, less 2
  await expect(p).not.toContainText("not used");

  // and back: a typed result, saved, listed as "typed in"
  await page.getByLabel(/Dollars per point/).fill("");
  await page.getByLabel(/Result after costs/).fill("-120.00");
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\?from=2025-10-01/);
  await page.goto(tradesFor(acct.id));
  const row = page.getByRole("row", { name: /TY1/ });
  await expect(row).toContainText("-$120.00");
  await expect(row).toContainText("typed in");
  await expect(row).toContainText("no dollars per point");
});
