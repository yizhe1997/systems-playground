import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makeAccount, makeTrade, uniq } from "./helpers";
import { OCTOBER, analyticsUrl, homeUrl, referenceMonth } from "./helpers_analytics";

// Accessibility pass (feature 005): WCAG 2 A and AA, contrast included, on Home, Analytics and Rule replay in their states,
// in the light and the night colour set.

async function clean(page: Page, name: string) {
  await expect(page).toHaveTitle(/.+/);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `${name}: accessibility violations`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("H1 Home: filled, the chart tables open, the empty states, only unjudged trades", async ({ page }) => {
      const ref = await referenceMonth("A11yHome");
      await page.goto(homeUrl(ref.id));
      await expect(page.getByRole("region", { name: "Needs you" })).toBeVisible();
      await clean(page, "H1 filled");
      await page.getByText("View as table").first().click();
      await page.getByRole("group", { name: "Headline figures, USD" }).locator("summary").first().click();
      await clean(page, "H1 table and a definition open");
      await page.goto(`/?period=custom&from=2019-01-01&to=2019-12-31&account=${ref.id}`);
      await expect(page.getByText("No trades in this period.")).toBeVisible();
      await clean(page, "H1 no trades in the period");
      const bare = await makeAccount(uniq("A11yBare"));
      await makeTrade(bare.id, { entryAt: "2026-10-01T09:41", exitAt: "2026-10-01T09:58" });
      await page.goto(homeUrl(bare.id));
      await expect(page.getByText("None of these 1 trades is judged yet.")).toBeVisible();
      await clean(page, "H1 only unjudged");
      await page.goto(`/?period=custom&from=2026-10-31&to=2026-10-01&account=${bare.id}`);
      await expect(page.getByText(/The end is before the start/).first()).toBeVisible();
      await clean(page, "H4 invalid range");
    });

    test("H2 Analytics: filled, a definition open, few trades, the band", async ({ page }) => {
      const ref = await referenceMonth("A11yStats");
      await page.goto(analyticsUrl(ref.id));
      await expect(page.getByRole("row", { name: /^Net result/ })).toBeVisible();
      await clean(page, "H2 filled");
      await page.getByRole("row", { name: /^Profit factor/ }).getByText("Definition").click();
      await clean(page, "H2 definition");
      await page.goto(`/analytics?period=custom&from=2026-10-01&to=2026-10-01&account=${ref.id}`);
      await clean(page, "H2 few trades");
      await page.goto(analyticsUrl(ref.id, "", "&band=40"));
      await expect(page.getByText(/set aside from the win rate/)).toBeVisible();
      await clean(page, "H2 band on");
    });

    test("H3 Rule replay and mistakes: filled and nothing judged", async ({ page }) => {
      const ref = await referenceMonth("A11yReplay");
      await page.goto(analyticsUrl(ref.id, "/replay"));
      await expect(page.getByText("Rule replay").first()).toBeVisible();
      await clean(page, "H3 filled");
      const bare = await makeAccount(uniq("A11yNone"));
      await makeTrade(bare.id, { entryAt: "2026-10-01T09:41", exitAt: "2026-10-01T09:58" });
      await page.goto(`/analytics/replay?${OCTOBER}&account=${bare.id}`);
      await expect(page.getByText("No trade judged yet.")).toBeVisible();
      await clean(page, "H3 nothing judged");
    });
  });
}
