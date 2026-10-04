import { expect, test } from "@playwright/test";
import { fillTrade, makeAccount, makeTrade, tradesFor, uniq } from "./helpers";

// The quickstart's "done when": the browser run completes with no console errors.
test("no console errors or failed requests across the five screens and the main actions", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`);
  });

  const acct = await makeAccount(uniq("Console"));
  await makeTrade(acct.id, { instrument: "CO1" });
  for (const url of ["/trades", tradesFor(acct.id), tradesFor(acct.id, true), "/accounts", "/accounts?archived=1", "/settings", "/trades/new"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }
  await fillTrade(page, { account: acct.name, instrument: "CO2", direction: "Short", size: "1", entryPrice: "10", entryDate: "2025-10-01", entryTime: "09:00", exitPrice: "9", exitDate: "2025-10-01", exitTime: "09:30", dollarsPerPoint: "5" });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\?from=2025-10-01/);
  await page.getByRole("button", { name: /Delete CO2/ }).click();
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});
