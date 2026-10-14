import { expect, test } from "@playwright/test";
import { gotoAccount, api, fillTrade, makeAccount, makeTrade, preview, tradesFor, uniq, rowAction } from "./helpers";

test("the preview shows the trading day, from the entry and the account's start", async ({ page }) => {
  const acct = await makeAccount(uniq("Day"), "USD", "17:00");
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: acct.name, instrument: "TD1", direction: "Long", size: "1",
    entryPrice: "100", entryDate: "2025-10-07", entryTime: "17:00",
    exitPrice: "101", exitDate: "2025-10-07", exitTime: "17:30", dollarsPerPoint: "10",
  });
  await expect(preview(page)).toContainText("Wed 8 Oct 2025");
  await fillTrade(page, { entryDate: "2025-10-07", entryTime: "16:00", exitDate: "2025-10-07", exitTime: "16:59" });
  await expect(preview(page)).toContainText("Tue 7 Oct 2025");
});

test("a time that does not exist is refused in the form's words", async ({ page }) => {
  const acct = await makeAccount(uniq("Gap"), "USD", "17:00");
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: acct.name, instrument: "GP1", direction: "Long", size: "1",
    entryPrice: "100", entryDate: "2025-03-09", entryTime: "02:30",
    exitPrice: "101", exitDate: "2025-03-09", exitTime: "04:30", dollarsPerPoint: "10",
  });
  await expect(preview(page)).toContainText("That time does not exist on that date in this time zone.");
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page.getByText("! That time does not exist on that date in this time zone.")).toBeVisible();
});

test("changing the account's start moves its trades to the right trading day", async ({ page }) => {
  const acct = await makeAccount(uniq("Start"), "USD", "17:00");
  await makeTrade(acct.id, { instrument: "ST1", entryAt: "2025-10-07T17:00", exitAt: "2025-10-07T17:30" });
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /ST1/ })).toContainText("Wed 8 Oct");

  await gotoAccount(page, acct.name);
  await rowAction(page, acct.name, "Edit");
  const dialog = page.getByRole("dialog", { name: "Edit account" });
  await dialog.getByLabel(/Trading-day start/).fill("");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();

  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /ST1/ })).toContainText("Tue 7 Oct");
});

test("changing the time zone in Settings moves trading days, never the instant", async ({ page }) => {
  const acct = await makeAccount(uniq("Zone"), "USD", "17:00");
  const t = await makeTrade(acct.id, { instrument: "ZN1", entryAt: "2025-10-07T16:00", exitAt: "2025-10-07T16:30" });
  expect(t.tradingDay).toBe("2025-10-07");
  const before = (await api("GET", `/trades/${t.id}`)).data;
  try {
    await page.goto("/settings");
    await expect(page.getByText("Current time in this zone:")).toContainText(/\d{2}:\d{2}/);
    await page.getByLabel(/Time zone/).fill("America/New_York");
    await expect(page.getByText("Eastern Time")).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Trading days were recomputed.")).toBeVisible();

    const after = (await api("GET", `/trades/${t.id}`)).data;
    expect(after.tradingDay).toBe("2025-10-08");
    expect(new Date(after.exitAt).getTime()).toBe(new Date(before.exitAt).getTime());

    // a name that is not a zone is refused
    await page.getByLabel(/Time zone/).fill("Nowhere/Land");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("! Choose a time zone from the list.")).toBeVisible();
  } finally {
    await api("PUT", "/settings", { timeZone: "America/Chicago" });
  }
});
