import { expect, test } from "@playwright/test";
import { api, makeAccount, uniq } from "./helpers";
import { dayUrl, reviewsUrl } from "./helpers_reviews";

// The focus is the owner's and shared by every account, so this spec keeps to weeks no other spec writes a focus for.
const MON = "2024-03-11"; // the week of 11 Mar to 17 Mar 2024
const weekUrl = (accountId: string, date = "2024-03-13") => `/reviews/week?account=${accountId}&date=${date}`;

async function trade(accountId: string, day: string) {
  const r = await api("POST", "/trades", { accountId, instrument: "NQ", direction: "long", size: "1", cost: "0", dollarsPerPoint: "20", entryAt: `${day}T09:00`, exitAt: `${day}T09:30`, entryPrice: "100", exitPrice: "101" });
  expect(r.status, JSON.stringify(r.data)).toBe(201);
}

test("the week as its seven days, the numbers with the missing day counted, the focus and the mark", async ({ page }) => {
  const a = await makeAccount(uniq("Weekly"));
  await trade(a.id, MON);
  await trade(a.id, "2024-03-13");
  await api("PUT", "/reviews/day", { accountId: a.id, date: "2024-03-13", didWell: "Waited for the retest", mentalGrade: 4, markReviewed: true });

  // from Reviews: Open weekly review (the link works)
  await page.goto(reviewsUrl(a.id, "2024-03"));
  await page.locator("details.week", { hasText: "Week of 11 Mar to 17 Mar" }).getByRole("link", { name: "Open weekly review" }).click();
  await expect(page).toHaveURL(/\/reviews\/week\?.*date=2024-03-11/);
  await expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible();
  await expect(page.getByText("Week of 11 Mar to 17 Mar 2024 ·")).toBeVisible();

  await page.goto(weekUrl(a.id));
  // the days: the missing Monday is named and counted; a reviewed day shows what was written; empty days are one line
  await expect(page.getByText("No review for Mon 11 Mar. Its 1 trade (+$20.00, plan followed 0 of 1) are included in the totals below.")).toBeVisible();
  await expect(page.getByText("Waited for the retest")).toBeVisible();
  await expect(page.getByText("Mental 4 of 5 · Technical — of 5")).toBeVisible();
  await expect(page.getByText("No trades on Tue 12 Mar.")).toBeVisible();
  await expect(page.getByText("No trades on Sun 17 Mar.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review Monday 11 March 2024" })).toBeVisible();

  // the week in numbers include the missing day, with the process figure beside the money
  await expect(page.getByRole("heading", { name: "The week in numbers" })).toBeVisible();
  const net = page.locator(".stat", { hasText: "Net result" });
  await expect(net).toContainText("+$40.00");
  await expect(net).toContainText("Plan followed on 0 of 2 trades");
  await expect(page.getByText("How these are counted:")).toBeVisible();
  await expect(page.locator(".chip", { hasText: "Missing" }).first()).toBeVisible(); // the week ended with no mark

  // the focus of the week, written here, shows on the days too
  await expect(page.getByText("No focus for this week yet.")).toBeVisible();
  await page.getByRole("button", { name: "Write the focus for the week" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Focus for the week of 11 Mar to 17 Mar").fill("Only the first hour.");
  await dialog.getByRole("button", { name: "Save focus" }).click();
  await expect(page.getByText("Only the first hour.")).toBeVisible();
  await page.goto(dayUrl(a.id, "2024-03-13"));
  await expect(page.getByText("Only the first hour.")).toBeVisible();

  // mark as reviewed: the time, and only the mark
  await page.goto(weekUrl(a.id));
  await expect(page.getByText("Weekly reviews save only this mark and its time.")).toBeVisible();
  await page.getByRole("button", { name: "Mark as reviewed" }).click();
  await expect(page.getByText(/^Reviewed \w{3} \d+ \w{3} \d{2}:\d{2}$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as reviewed" })).toHaveCount(0);
});

test("previous and next week, and the week picker with its marks", async ({ page }) => {
  const a = await makeAccount(uniq("Picker"));
  await trade(a.id, MON);
  await page.goto(weekUrl(a.id, MON));
  await page.getByRole("link", { name: "< Previous week" }).click();
  await expect(page).toHaveURL(/date=2024-03-04/);
  await expect(page.getByText("Week of 4 Mar to 10 Mar 2024 ·")).toBeVisible();
  await page.getByRole("link", { name: "Next week >" }).click();
  await expect(page).toHaveURL(/date=2024-03-11/);

  await page.getByRole("button", { name: /Week of 11 Mar to 17 Mar/ }).click();
  const picker = page.getByRole("dialog", { name: "Pick a week" });
  await expect(picker.getByText("March 2024")).toBeVisible();
  await expect(picker.getByRole("link", { name: "Week of 11 Mar to 17 Mar, Missing" })).toBeVisible();
  await expect(picker.getByText("Click any day, or a row, to open that week. Weekends count.")).toBeVisible();
  await picker.getByRole("link", { name: /^Week of 4 Mar to 10 Mar/ }).click();
  await expect(page).toHaveURL(/date=2024-03-04/);

  // This week goes to the current week
  await page.getByRole("button", { name: /Week of 4 Mar to 10 Mar/ }).click();
  await page.getByRole("dialog", { name: "Pick a week" }).getByRole("link", { name: "This week" }).click();
  await expect(page).not.toHaveURL(/2024/);
  await expect(page.getByRole("button", { name: "Mark as reviewed" })).toBeEnabled();
});

test("a week that has not started cannot be marked", async ({ page }) => {
  const a = await makeAccount(uniq("Future"));
  await page.goto(weekUrl(a.id, "2099-01-07"));
  await expect(page.getByRole("button", { name: "Mark as reviewed" })).toBeDisabled();
  await expect(page.getByText("! This week has not started yet. Mark as reviewed is unavailable.")).toBeVisible();
  await expect(page.getByText("This day has not happened yet.").first()).toBeVisible();
});
