import { expect, test } from "@playwright/test";
import { api, makeAccount, tradesFor, uniq } from "./helpers";
import { dayUrl, reviewsUrl, sampleDay } from "./helpers_reviews";

// SC-003 and SC-004: every screen that shows a money figure shows the process figure (the plan answer) beside it, in the
// same row or card, and every figure that cannot be shown is a dash with its reason. Light and night.

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("a plan figure sits beside every money figure; a figure that cannot be shown is a dash with its reason", async ({ page }) => {
      const s = await sampleDay("Beside");
      await api("PUT", `/trades/${s.w}/judgement`, { planFollowed: "yes" });
      await api("PUT", `/trades/${s.l1}/judgement`, { planFollowed: "no", label: "mistake" });

      // Reviews: each day row with a money figure also says how many of its trades followed the plan
      await page.goto(reviewsUrl(s.id));
      const week = page.locator(".week", { hasText: "Week of 29 Sep to 5 Oct" });
      if ((await week.getAttribute("data-open")) === null) await week.getByRole("button", { name: /^Show or hide the days/ }).click();
      await expect(week.locator(".day-row").first()).toBeVisible();
      for (const row of await week.locator(".day-row").all()) {
        if ((await row.innerText()).includes("$")) await expect(row).toContainText(/Plan followed \d+ of \d+/);
      }
      await expect(page.getByText("The money figure always has the plan figure beside it.")).toBeVisible();

      // the daily review: the net result card, the trades table, the day total
      await page.goto(dayUrl(s.id));
      await expect(page.locator(".stat", { hasText: "Net result" })).toContainText(/Plan followed on \d+ of \d+ trades?/);
      for (const row of await page.locator("table.trade-grid tbody tr").all()) {
        await expect(row.locator("td").nth(4)).toContainText("$"); // the result
        await expect(row.locator("td").nth(5)).not.toBeEmpty(); // the plan answer, or a dash, in the next cell
      }
      await expect(page.getByText(/Day total .* followed the plan/)).toBeVisible();

      // the judge drawer: result and plan in one strip; a trade with no stop has a dash and its reason
      await page.getByRole("button", { name: /^Judge NQ Long at 10:14/ }).click();
      const strip = page.getByRole("dialog").getByRole("group", { name: "Result" });
      await expect(strip).toContainText("$");
      await expect(strip).toContainText("Plan");
      await expect(strip.getByText("—")).toBeVisible();
      await expect(strip.getByText("No stop recorded, so no risk figure.")).toBeVisible();
      await page.keyboard.press("Escape");

      // the weekly review: the week's net result with the plan figure, each day row with money has its plan line
      await page.goto(`/reviews/week?account=${s.id}&date=2025-10-01`);
      await expect(page.locator(".stat", { hasText: "Net result" })).toContainText(/Plan followed on \d+ of \d+ trades?/);
      for (const row of await page.locator(".wk-day-head").all()) {
        if ((await row.innerText()).includes("$")) await expect(row).toContainText(/Plan followed \d+ of \d+/);
      }

      // the Trades list: the Plan column is beside the net result
      await page.goto(tradesFor(s.id));
      await expect(page.getByRole("columnheader", { name: "Plan" })).toBeVisible();
      for (const row of await page.locator("tbody tr").all()) await expect(row).toContainText(/Followed|Partly|Not followed|Not judged yet/);

      // a day with no trades: the money figure is a dash and says why; the win rate too
      const empty = await makeAccount(uniq("BesideEmpty"));
      await page.goto(dayUrl(empty.id, "2025-10-02"));
      const net = page.locator(".stat", { hasText: "Net result" });
      await expect(net).toContainText("—");
      await expect(net).toContainText("no trades");
      await expect(page.locator(".stat", { hasText: "Win rate" })).toContainText("no trades");
    });
  });
}
