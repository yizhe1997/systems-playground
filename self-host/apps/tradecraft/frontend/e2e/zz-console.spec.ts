import { expect, test } from "@playwright/test";
import { fillTrade, makeAccount, makeTrade, tradesFor, uniq, rowAction } from "./helpers";

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
  for (const url of ["/trades", tradesFor(acct.id), tradesFor(acct.id, true), "/accounts", "/accounts?archived=1", "/settings", "/settings/access", "/settings/integrations", "/trades/new"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }
  await fillTrade(page, { account: acct.name, instrument: "CO2", direction: "Short", size: "1", entryPrice: "10", entryDate: "2025-10-01", entryTime: "09:00", exitPrice: "9", exitDate: "2025-10-01", exitTime: "09:30", dollarsPerPoint: "5" });
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\?from=2025-10-01/);
  await page.goto(tradesFor(acct.id)); // the list of every account is paged at 10; this account's own list has the trade
  await rowAction(page, /CO2/, "Delete");
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});

// The same for the review screens of feature 001: no console error, no failed request (the dead weekly-review link is gone).
test("no console errors or failed requests across Reviews, a day, a week, Mistakes and their dialogs", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/_next/image")) problems.push(`${r.status()} ${r.url()}`);
  });
  const { sampleDay, reviewsUrl, dayUrl } = await import("./helpers_reviews");
  const s = await sampleDay("Console1");
  for (const url of [reviewsUrl(s.id), dayUrl(s.id), `/reviews/week?account=${s.id}&date=2025-10-01`, "/mistakes", "/mistakes?period=month&date=2025-10-01"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }
  await page.goto(dayUrl(s.id));
  await page.getByRole("button", { name: /^Judge NQ Long at 10:14/ }).click();
  await page.getByRole("dialog").getByLabel("Yes").check();
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});
