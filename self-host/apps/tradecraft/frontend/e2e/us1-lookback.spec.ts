import { expect, test } from "@playwright/test";
import { api, makeAccount, uniq } from "./helpers";
import { dayUrl, reviewsUrl, sampleDay } from "./helpers_reviews";

async function trade(accountId: string, entry: string, exit: string) {
  const r = await api("POST", "/trades", { accountId, instrument: "NQ", direction: "long", size: "1", cost: "0", dollarsPerPoint: "20", entryAt: entry, exitAt: exit, entryPrice: "100", exitPrice: "101" });
  expect(r.status, JSON.stringify(r.data)).toBe(201);
}

test("Jump to date shows today until another day is chosen, then opens the week that holds it; weeks collapse and open", async ({ page }) => {
  const s = await sampleDay("Look");
  await trade(s.id, "2025-09-10T09:00", "2025-09-10T09:30");
  await page.goto(reviewsUrl(s.id));

  // the date field opens on the account's today, and the month heading says which month is listed
  const today = (await api("GET", `/reviews?accountId=${s.id}`)).data.today as string;
  await expect(page.getByLabel("Jump to date")).toHaveValue(today);
  await expect(page.getByText("This month (October 2025)")).toBeVisible();
  // the old month arrows, month list and Today button are gone: the date field covers them
  await expect(page.getByRole("link", { name: /^Earlier:/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Today" })).toHaveCount(0);

  // a day in another month opens that month with the week holding it open
  await page.getByLabel("Jump to date").fill("2025-09-10");
  await expect(page).toHaveURL(/month=2025-09&open=2025-09-10/);
  await expect(page.getByLabel("Jump to date")).toHaveValue("2025-09-10");
  await expect(page.getByText("This month (September 2025)")).toBeVisible();
  await expect(page.locator("details.week", { hasText: "Week of 8 Sep to 14 Sep" })).toHaveAttribute("open", "");

  // the current month with the current week open, when no day is chosen
  await page.goto(`/reviews?account=${s.id}`);
  await expect(page.locator("details.week[open]")).toHaveCount(1);

  // Jump to date opens the week that holds it
  await page.goto(reviewsUrl(s.id));
  await page.getByLabel("Jump to date").fill("2025-10-01");
  await expect(page).toHaveURL(/open=2025-10-01/);
  const week = page.locator("details.week", { hasText: "Week of 29 Sep to 5 Oct" });
  await expect(week).toHaveAttribute("open", "");
  await expect(week.getByText("Wed 1 Oct")).toBeVisible();
  // collapse and open
  await week.locator("summary").click();
  await expect(week).not.toHaveAttribute("open", "");
  await week.locator("summary").click();
  await expect(week).toHaveAttribute("open", "");
  await expect(week.getByText("3 trades")).toBeVisible();
  await expect(week.getByText("+$45.00")).toBeVisible();
  await expect(week.getByText("Plan followed 0 of 3")).toBeVisible(); // the money figure always has the plan figure beside it
});

test("the filters count the listed days and show only matching ones", async ({ page }) => {
  const s = await sampleDay("Filters");
  await trade(s.id, "2025-10-07T09:00", "2025-10-07T09:30");
  await api("PUT", "/reviews/day", { accountId: s.id, date: "2025-10-07", didWell: "x" });
  await api("PUT", "/reviews/day", { accountId: s.id, date: "2025-10-01", markReviewed: true });
  await page.goto(reviewsUrl(s.id));
  await expect(page.getByRole("link", { name: "Missing 0" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Draft 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reviewed 1" })).toBeVisible();
  await page.getByRole("link", { name: "Draft 1" }).click();
  await expect(page).toHaveURL(/filter=draft/);
  await expect(page.getByText("Tue 7 Oct")).toBeVisible();
  await expect(page.getByText("Wed 1 Oct")).toBeHidden();
});

test("an account with nothing yet shows the empty state with Add a trade", async ({ page }) => {
  const acct = await makeAccount(uniq("Nothing"));
  await page.goto(reviewsUrl(acct.id, "2025-10"));
  await expect(page.getByText(`Nothing to review yet for ${acct.name}.`)).toBeVisible();
  await expect(page.getByText("Log your first trade and its day appears here, ready to review.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a trade" })).toBeVisible();
});

test("previous and next day, and the day picker marks days with trades and missing reviews", async ({ page }) => {
  const s = await sampleDay("Picker");
  await page.goto(dayUrl(s.id));
  await page.getByRole("link", { name: /< Tue 30 Sep/ }).click();
  await expect(page).toHaveURL(/date=2025-09-30/);
  await page.getByRole("link", { name: /Wed 1 Oct >/ }).click();
  await expect(page).toHaveURL(/date=2025-10-01/);

  await page.getByRole("button", { name: /Wed 1 Oct v/ }).click();
  const picker = page.getByRole("dialog", { name: "Pick a day" });
  await expect(picker.getByText("October 2025")).toBeVisible();
  await expect(picker.getByRole("link", { name: /Wednesday 1 October 2025, has trades, review missing/ }).or(picker.getByRole("link", { name: /Wed 1 Oct 2025, has trades, review missing/ }))).toBeVisible();
  await expect(picker.getByText("• has trades · ! review missing")).toBeVisible();
  // pick another day, then go to today
  await picker.getByRole("link", { name: /^15,?\s|15/ }).first().click();
  await expect(page).toHaveURL(/date=2025-10-15/);
  await page.getByRole("button", { name: /Wed 15 Oct v/ }).click();
  await page.getByRole("dialog", { name: "Pick a day" }).getByRole("link", { name: "Go to today" }).click();
  await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
});
