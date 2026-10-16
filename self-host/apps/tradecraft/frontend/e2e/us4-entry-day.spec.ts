import { expect, test } from "@playwright/test";
import { fillTrade, makeAccount, makeTrade, preview, tradesFor, uniq } from "./helpers";

// Feature 003, user story 4: a trade belongs to the day it was entered.

test("the preview says the entry was read, and names the day of the entry", async ({ page }) => {
  const acct = await makeAccount(uniq("Entry"), "USD", "17:00");
  await page.goto("/trades/new");
  // entered 16:50, exited 17:10: the same trading day as the entry, whatever the exit
  await fillTrade(page, {
    account: acct.name, instrument: "EN1", direction: "Long", size: "1",
    entryPrice: "100", entryDate: "2025-10-07", entryTime: "16:50",
    exitPrice: "101", exitDate: "2025-10-07", exitTime: "17:10", dollarsPerPoint: "10",
  });
  await expect(preview(page)).toContainText("Tue 7 Oct 2025");
  await expect(preview(page)).toContainText(`entry read in Central Time; ${acct.name} starts its trading day at 17:00`);
  // entered at the start: the next day
  await fillTrade(page, { entryDate: "2025-10-07", entryTime: "17:00" });
  await expect(preview(page)).toContainText("Wed 8 Oct 2025");
});

test("the list shows Entry time first, and a day's table shows the entry and is in entry order", async ({ page }) => {
  const acct = await makeAccount(uniq("Order"));
  const held = `HLD${Date.now().toString(36).toUpperCase()}`;
  const quick = `QCK${Date.now().toString(36).toUpperCase()}`;
  // entered first and exited last, so by exit it would be listed the other way round
  await makeTrade(acct.id, { instrument: held, entryAt: "2025-10-06T09:00", exitAt: "2025-10-06T15:00" });
  await makeTrade(acct.id, { instrument: quick, entryAt: "2025-10-06T10:00", exitAt: "2025-10-06T10:30" });

  await page.goto(tradesFor(acct.id));
  const heads = page.locator("thead th");
  await expect(heads.nth(0)).toHaveText("Entry time");
  await expect(heads.nth(1)).toHaveText("Exit time");
  await expect(heads.nth(2)).toHaveText("Trading day");
  const rows = page.locator("tbody tr");
  await expect(rows.nth(0)).toContainText(quick); // newest entry first
  await expect(rows.nth(1)).toContainText(held);

  await page.goto(`/reviews/day?account=${acct.id}&date=2025-10-06`);
  await expect(page.getByRole("columnheader", { name: "Entry time" })).toBeVisible();
  const day = page.locator("tbody tr");
  await expect(day.nth(0)).toContainText(held); // entry order: 09:00, then 10:00
  await expect(day.nth(0)).toContainText("09:00");
  await expect(day.nth(1)).toContainText(quick);
});

test("a trade logged across the start time moves with the account's start", async ({ page }) => {
  const acct = await makeAccount(uniq("Across"), "USD", "17:00");
  await makeTrade(acct.id, { instrument: "ACR1", entryAt: "2025-10-07T16:50", exitAt: "2025-10-07T17:10" });
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /ACR1/ })).toContainText("Tue 7 Oct"); // the entry's day, not the exit's
});
