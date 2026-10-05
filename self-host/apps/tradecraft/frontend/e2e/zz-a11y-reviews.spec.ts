import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { api, uniq } from "./helpers";
import { dayUrl, reviewsUrl, sampleDay } from "./helpers_reviews";

// Accessibility pass for feature 001 (FR-024): WCAG 2 A and AA rules, including text contrast of at least 4.5:1, on
// Reviews, the daily review, the judge drawer, Mistakes with its dialogs, the weekly review and the focus dialog, in the
// light and in the night colour set. Then the keyboard-only checks, and a check that no status is carried by colour alone.

async function clean(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `${name}: accessibility violations`).toEqual([]);
}

/** The sample day with a judged loss, a mistake tag, a whole-day record and a missing Monday. */
async function setup() {
  const s = await sampleDay("A11y");
  const rush = uniq("Rush");
  const m = await api("POST", "/mistakes", { name: rush });
  await api("PUT", `/trades/${s.l1}/judgement`, { planFollowed: "no", label: "mistake", mistakeIds: [m.data.id] });
  await api("PUT", `/trades/${s.w}/judgement`, { planFollowed: "yes" });
  await api("PUT", "/reviews/day-mistakes", { accountId: s.id, date: "2025-10-01", mistakeIds: [m.data.id] });
  await api("POST", "/trades", { accountId: s.id, instrument: "NQ", direction: "long", size: "1", cost: "0", dollarsPerPoint: "20", entryAt: "2025-09-29T09:00", exitAt: "2025-09-29T09:30", entryPrice: "100", exitPrice: "101" });
  await api("PUT", "/mistakes/" + m.data.id, { name: rush, stopLine: 2, stopPeriod: "week" });
  return { ...s, rush };
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("S0 Reviews: weeks, the filters and the empty state", async ({ page }) => {
      const s = await setup();
      await page.goto(reviewsUrl(s.id));
      await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
      await page.locator("details.week", { hasText: "Week of 29 Sep to 5 Oct" }).locator("summary").click();
      await clean(page, "S0 filled");
      const empty = await api("POST", "/accounts", { name: uniq("A11yEmpty"), currency: "USD" });
      await page.goto(reviewsUrl(empty.data.id));
      await clean(page, "S0 empty");
    });

    test("S1 daily review and S2 judge drawer", async ({ page }) => {
      const s = await setup();
      await page.goto(dayUrl(s.id));
      await expect(page.getByRole("heading", { name: "Daily review" })).toBeVisible();
      await clean(page, "S1 filled");
      await page.getByRole("button", { name: /^Judge NQ Long at 10:52/ }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer.getByText("What was this decision?")).toBeVisible();
      await clean(page, "S2 loss, not judged");
      await drawer.getByLabel("No", { exact: true }).check();
      await drawer.getByLabel(/^Mistake/).check();
      await expect(drawer.getByText("Which mistakes?")).toBeVisible();
      await clean(page, "S2 loss, mistake with tags");
      await drawer.getByRole("button", { name: "Close" }).click();
      await expect(drawer.getByText("Leave without saving?")).toBeVisible();
      await clean(page, "S2 leave confirmation");
      await drawer.getByRole("button", { name: "Leave" }).click();
      await page.getByRole("button", { name: /^Judge NQ Long at 09:58/ }).click();
      await expect(drawer.getByLabel(/This win was a mistake/)).toBeVisible();
      await clean(page, "S2 win");
      await drawer.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: /Wed 1 Oct/ }).click();
      await expect(page.getByRole("dialog", { name: "Pick a day" })).toBeVisible();
      await clean(page, "S1 day picker");
    });

    test("S3 Mistakes: counter, stop line, rename, retire and the empty state", async ({ page }) => {
      const s = await setup();
      await page.goto("/mistakes?period=week&date=2025-10-01");
      await expect(page.getByRole("row", { name: new RegExp(s.rush) })).toContainText("STOP TRADING"); // a stop line reached
      await clean(page, "S3 counter");
      await page.getByRole("button", { name: `Stop line ${s.rush}` }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").getByLabel("Stop line", { exact: true }).fill("0");
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("! Stop line must be 1 or more.")).toBeVisible();
      await clean(page, "S3 stop line with an error");
      await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      await page.locator(".manage-list li", { hasText: s.rush }).getByRole("button", { name: `Rename ${s.rush}` }).click();
      await page.getByRole("dialog").getByLabel("Name").fill("chased entry");
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
      await expect(page.getByText(/already exists/)).toBeVisible();
      await clean(page, "S3 rename, name already used");
      await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      await page.locator(".manage-list li", { hasText: s.rush }).getByRole("button", { name: `Retire ${s.rush}` }).click();
      await clean(page, "S3 retire");
      await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      await page.goto("/mistakes?period=month&date=2019-03-06");
      await expect(page.getByText("No mistakes tagged in this month.")).toBeVisible();
      await clean(page, "S3 empty");
    });

    test("S5 weekly review, its week picker and the focus dialog", async ({ page }) => {
      const s = await setup();
      await page.goto(`/reviews/week?account=${s.id}&date=2025-10-01`);
      await expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible();
      await clean(page, "S5 filled");
      await page.getByRole("button", { name: /Week of 29 Sep to 5 Oct/ }).click();
      await expect(page.getByRole("dialog", { name: "Pick a week" }).getByRole("link", { name: /Week of 29 Sep/ })).toBeVisible();
      await clean(page, "S5 week picker");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Write the focus for the week" }).click();
      await page.getByRole("dialog").getByLabel(/Focus for the week of/).fill("x".repeat(300));
      await expect(page.getByText(/Too long: 20 characters over/)).toBeVisible();
      await clean(page, "S4 focus too long");
    });
  });
}

test("keyboard only: stars, the drawer, dialogs, the collapsible weeks and the pickers", async ({ page }) => {
  const s = await setup();
  await page.goto(dayUrl(s.id));

  // stars: arrow keys move the grade, each reads "n of 5"
  const mental = page.getByRole("group", { name: "Mental grade" });
  await mental.getByRole("radio", { name: "3 of 5" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(mental.getByRole("radio", { name: "4 of 5" })).toBeChecked();

  // the drawer opens from the keyboard, keeps focus inside, and Escape closes it and returns focus to its button
  const judge = page.getByRole("button", { name: /^Judge NQ Long at 10:52/ });
  await judge.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(judge).toBeFocused();

  // a dialog (the focus dialog) closes with Escape
  await page.getByRole("button", { name: "Write the focus for the month" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  // the day picker opens and closes from the keyboard
  await page.getByRole("button", { name: /Wed 1 Oct/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Pick a day" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Pick a day" })).toBeHidden();

  // the weeks of Reviews open and close from the keyboard
  await page.goto(reviewsUrl(s.id));
  const week = page.locator("details.week", { hasText: "Week of 29 Sep to 5 Oct" });
  await week.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(week).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(week).not.toHaveAttribute("open", "");

  // the week picker of the weekly review
  await page.goto(`/reviews/week?account=${s.id}&date=2025-10-01`);
  await page.getByRole("button", { name: /Week of 29 Sep to 5 Oct/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Pick a week" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Pick a week" })).toBeHidden();
});

test("no status is carried by colour alone: every state and label is also written", async ({ page }) => {
  const s = await setup();
  await page.goto(reviewsUrl(s.id));
  const week = page.locator("details.week", { hasText: "Week of 29 Sep to 5 Oct" });
  await week.locator("summary").click();
  await expect(week.locator(".chip", { hasText: "Missing" }).first()).toBeVisible();
  await page.goto(dayUrl(s.id));
  for (const word of ["Mistake", "Not judged yet"]) await expect(page.locator("table.trade-grid").getByText(word).first()).toBeVisible();
  await page.goto("/mistakes?period=week&date=2025-10-01");
  await expect(page.getByText(/STOP TRADING: \d+ of \d+ this week/).first()).toBeVisible();
  // a profit or loss tint is only ever on text that also carries its sign
  const tinted = await page.goto(dayUrl(s.id)).then(() => page.locator("td.num").allInnerTexts());
  for (const t of tinted.filter((x) => /\$/.test(x))) expect(t).toMatch(/^[+-]/);
});
