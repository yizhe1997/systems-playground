import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { api, makeAccount } from "./helpers";
import { dayUrl, reviewsUrl } from "./helpers_reviews";

// Not a check: it captures the built screens of feature 001 for the visual review (a folder outside the repository, see CAPTURE_DIR).
// Run on a fresh stack:  CAPTURE_SCREENS=light npx playwright test e2e/zz-screens-reviews.spec.ts   (and =dark)
// SCALE=wide captures the same screens on a 2560 x 1440 window, where the wide-screen scale steps apply.
const scheme = process.env.CAPTURE_SCREENS;
const wide = process.env.SCALE === "wide";
const out = process.env.CAPTURE_DIR ?? path.join(tmpdir(), "tradecraft-built", "001-journal-and-reflect"); // outside the repository: screenshots are never committed

test.skip(!scheme, "set CAPTURE_SCREENS=light or dark to capture the built screens");
test.use({ colorScheme: scheme === "dark" ? "dark" : "light", viewport: wide ? { width: 2560, height: 1440 } : { width: 1440, height: 900 } });

async function shot(page: Page, name: string) {
  mkdirSync(out, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, `${name}${wide ? "-wide" : ""}-${scheme}.png`), fullPage: false });
}

async function trade(accountId: string, o: Record<string, unknown>) {
  const r = await api("POST", "/trades", { accountId, instrument: "NQ", direction: "long", size: "1", cost: "0", dollarsPerPoint: "20", ...o });
  expect(r.status, JSON.stringify(r.data)).toBe(201);
  return r.data.id as string;
}

test("capture the 001 screens", async ({ page }) => {
  test.setTimeout(240_000);
  const funded = await makeAccount("Funded 50K", "USD", "17:00");
  const practice = await makeAccount("Practice", "USD");

  // the sample day of the wireframes (Wed 1 Oct 2025) plus a missing Monday, a Tuesday after 17:00 and a Practice trade
  await trade(funded.id, { entryAt: "2025-09-29T09:00", exitAt: "2025-09-29T09:30", entryPrice: "21000", exitPrice: "21006" });
  await trade(funded.id, { entryAt: "2025-09-30T17:10", exitAt: "2025-09-30T17:30", entryPrice: "21500", exitPrice: "21502.75", stopPrice: "21490" });
  const w = await trade(funded.id, { size: "2", entryAt: "2025-10-01T09:41", exitAt: "2025-10-01T09:58", entryPrice: "21450", exitPrice: "21465", stopPrice: "21440" });
  const l1 = await trade(funded.id, { size: "2", entryAt: "2025-10-01T10:14", exitAt: "2025-10-01T10:31", entryPrice: "21500", exitPrice: "21493.75", thesis: "Second push above the opening range. I entered before the candle closed." });
  const l2 = await trade(funded.id, { entryAt: "2025-10-01T10:40", exitAt: "2025-10-01T10:52", entryPrice: "21500", exitPrice: "21493.50", stopPrice: "21510" });
  await trade(practice.id, { entryAt: "2025-09-30T10:40", exitAt: "2025-09-30T11:05", entryPrice: "21500", exitPrice: "21493.5" });
  const ids: Record<string, string> = {};
  for (const n of ["Chased entry", "Moved stop", "Oversized"]) ids[n] = (await api("GET", "/mistakes")).data.find((m: any) => m.name === n).id;
  await api("PUT", `/mistakes/${ids["Moved stop"]}`, { name: "Moved stop", stopLine: 2, stopPeriod: "week" });
  await api("PUT", `/trades/${w}/judgement`, { planFollowed: "yes" });
  await api("PUT", `/trades/${l1}/judgement`, { planFollowed: "yes", label: "valid_loss" });
  await api("PUT", `/trades/${l2}/judgement`, { planFollowed: "no", label: "mistake", mistakeIds: [ids["Chased entry"], ids["Moved stop"]] });
  await api("PUT", "/reviews/day-mistakes", { accountId: funded.id, date: "2025-10-01", mistakeIds: [ids["Moved stop"]] });
  await api("PUT", "/reviews/day", { accountId: funded.id, date: "2025-09-30", didWell: "Sized down after the open.", couldImprove: "Wait for the retest.", nextFocus: "One setup only.", mentalGrade: 4, technicalGrade: 3, markReviewed: true });
  await api("PUT", "/reviews/day", { accountId: funded.id, date: "2025-10-01", didWell: "Waited for the retest on the first trade.", couldImprove: "Stop moving the stop.", nextFocus: "A+ setups only.", mentalGrade: 4, technicalGrade: 4 });
  await api("PUT", "/focus", { period: "week", date: "2025-10-01", body: "A+ setups only. Maximum three trades a day." });
  await api("PUT", "/focus", { period: "month", date: "2025-10-01", body: "Grade every trade, not just the day." });

  // S0
  await page.goto(reviewsUrl(funded.id));
  await page.locator(".week", { hasText: "Week of 29 Sep to 5 Oct" }).getByRole("button", { name: /^Show or hide the days/ }).click();
  await shot(page, "s0-reviews-month");
  await page.getByRole("link", { name: /Missing/ }).first().click();
  await shot(page, "s0-reviews-filter-missing");
  await page.goto("/reviews?account=" + practice.id + "&month=2024-01");
  await shot(page, "s0-reviews-nothing-yet");

  // S1
  await page.goto(dayUrl(funded.id));
  await shot(page, "s1-daily-review-draft");
  await page.getByRole("button", { name: /Wed 1 Oct/ }).click();
  await shot(page, "s1-day-picker");
  await page.goto(dayUrl(funded.id, "2025-09-29"));
  await shot(page, "s1-daily-review-missing-day");
  await page.goto(dayUrl(funded.id, "2099-01-07"));
  await shot(page, "s1-daily-review-not-yet");

  // S2
  await page.goto(dayUrl(funded.id));
  await page.getByRole("button", { name: /^Judge NQ Long at 10:52/ }).click();
  await expect(page.getByRole("dialog").getByText("Which mistakes?")).toBeVisible();
  await shot(page, "s2-judge-a-loss-mistake");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Judge NQ Long at 09:58/ }).click();
  await shot(page, "s2-judge-a-win");
  await page.keyboard.press("Escape");

  // S3
  await page.goto("/mistakes?period=week&date=2025-10-01");
  await expect(page.getByText(/STOP TRADING/).first()).toBeVisible();
  await shot(page, "s3-mistakes-counter-week");
  await page.goto("/mistakes?period=month&date=2025-10-01");
  await shot(page, "s3-mistakes-counter-month");
  await page.getByRole("button", { name: "Stop line Moved stop" }).first().click();
  await page.getByRole("dialog").getByLabel("Stop line", { exact: true }).fill("0");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Stop line must be 1 or more.")).toBeVisible();
  await shot(page, "s3-stop-line-error");
  await page.keyboard.press("Escape");
  await page.locator(".manage-list li", { hasText: "Oversized" }).getByRole("button", { name: "Retire Oversized" }).click();
  await shot(page, "s3-retire-a-mistake");
  await page.keyboard.press("Escape");
  await page.goto("/mistakes?period=month&date=2019-03-06");
  await shot(page, "s3-nothing-tagged");

  // S4
  await page.goto(dayUrl(funded.id));
  await page.getByRole("button", { name: "Edit the focus for the week" }).click();
  await shot(page, "s4-focus-dialog");
  await page.getByRole("dialog").getByLabel(/Focus for the week of/).fill("x".repeat(307));
  await shot(page, "s4-focus-too-long");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();

  // S5
  await page.goto(`/reviews/week?account=${funded.id}&date=2025-10-01`);
  await shot(page, "s5-weekly-review");
  await page.getByRole("button", { name: /Week of 29 Sep to 5 Oct/ }).click();
  await shot(page, "s5-week-picker");
  await page.keyboard.press("Escape");
  await page.goto(`/reviews/week?account=${practice.id}&date=2025-10-01`);
  await shot(page, "s5-weekly-review-other-account");
});
