import { expect, test, type Page } from "@playwright/test";
import { api, makeAccount, makeTrade, uniq } from "./helpers";
import { OCTOBER, analyticsUrl, referenceMonth } from "./helpers_analytics";

// Feature 005, user stories 2 and 3 (screens H2 and H3): Analytics on the reference month of the quickstart.

const row = (page: Page, name: string) => page.getByRole("row", { name: new RegExp(`^${name}`) });

test("the performance table: every statistic with its sample, its plan figure and its definition", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(analyticsUrl(ref.id));
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
  await expect(page.getByText("12 trades, USD · Plan followed 6 of 12 · 3 not judged yet · R known for 8 of 12 trades")).toBeVisible();
  const want: [string, string][] = [
    ["Net result", "+$340.00"], ["Win rate", "7 of 12 (58%)"], ["Profit factor", "1.77"], ["Expectancy (?!in R)", "+$28.33 per trade"],
    ["Expectancy in R", "+0.31 R"], ["Average win", "+$111.43"], ["Average loss", "-$88.00"], ["Payoff ratio", "1.27"],
    ["Largest win", "+$200.00 (Thu 8 Oct)"], ["Largest loss", "-$150.00 (Tue 6 Oct)"], ["Maximum drawdown", "-$180.00"],
    ["Longest winning streak", "2 trades (Thu 8 Oct to Fri 9 Oct)"], ["Longest losing streak", "1 trade (Fri 2 Oct)"],
  ];
  for (const [name, value] of want) await expect(row(page, name), name).toContainText(value);
  await expect(row(page, "Net result")).toContainText("6 of 12");
  await expect(row(page, "Expectancy in R")).toContainText("6 of 8"); // the plan figure of the eight trades that have an R
  await expect(page.getByText(/^Maximum drawdown is the largest fall of the running result from a peak \(\$120\.00 on Thu 1 Oct\) to a trough \(-\$60\.00 on Tue 6 Oct\)/)).toBeVisible();
  // a definition opens in words
  await row(page, "Profit factor").getByText("Definition").click();
  await expect(row(page, "Profit factor")).toContainText("The sum of the net results of the winning trades divided by the sum of the net results of the losing trades");
});

test("a scope of one trade shows dashes with their reasons and never a zero", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(`/analytics?period=custom&from=2026-10-01&to=2026-10-01&account=${ref.id}`);
  await expect(row(page, "Profit factor")).toContainText("— no losing trades");
  await expect(row(page, "Expectancy (?!in R)")).toContainText("— needs at least 2 trades, has 1");
  await expect(row(page, "Maximum drawdown")).toContainText("— needs at least 2 trades, has 1");
  await expect(row(page, "Payoff ratio")).toContainText("— needs a win and a loss");
  await expect(row(page, "Average loss")).toContainText("— no losing trades");
  await expect(row(page, "Win rate")).toContainText("1 of 1 (100%)  few trades");
  await expect(row(page, "Net result")).toContainText("+$120.00");
});

test("the break-even band changes the win rate and says what it set aside, and leaves the money alone", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(analyticsUrl(ref.id));
  await page.getByLabel("Break-even band").fill("40");
  await page.getByLabel("Break-even band").press("Enter");
  await expect(page).toHaveURL(/band=40/);
  await expect(row(page, "Win rate")).toContainText("7 of 11 (64%)");
  await expect(page.getByText(/1 trade inside the break-even band set aside from the win rate/)).toBeVisible();
  await expect(row(page, "Net result")).toContainText("+$340.00");
  await expect(row(page, "Profit factor")).toContainText("1.77");
});

test("a breakdown row opens the Trades list for exactly its trades, and the chip takes the filter away", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(analyticsUrl(ref.id));
  const weekday = page.getByRole("region", { name: "By weekday, USD" });
  await expect(weekday.getByRole("row", { name: /^Tuesday/ })).toContainText("+$170.00");
  await expect(weekday.getByRole("row", { name: /^Wednesday/ })).toContainText("— no trades");
  await weekday.getByRole("link", { name: "Tuesday" }).click();
  await expect(page).toHaveURL(/\/trades\?.*weekday=2/);
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Weekday: Tuesday");
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByRole("link", { name: "Remove the filter Weekday: Tuesday" }).click();
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
  await expect(page.getByText("Showing 1 to 10 of 12")).toBeVisible();

  // instrument, direction and hour work the same way
  for (const [region, link, filter, n] of [["By instrument, USD", "ES", "Instrument: ES", 4], ["By direction, USD", "Short", "Direction: Short", 3], ["By hour of entry, USD", "10:00 to 10:59", "Hour: 10:00 to 10:59", 6]] as const) {
    await page.goto(analyticsUrl(ref.id));
    await page.getByRole("region", { name: region }).getByRole("link", { name: link }).click();
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText(filter);
    await expect(page.locator("tbody tr")).toHaveCount(n);
  }
});

test("Rule replay and the cost of each mistake, with the empty and partly judged states", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(analyticsUrl(ref.id, "/replay"));
  await expect(page.getByRole("link", { name: "Rule replay and mistakes" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Based on the 9 judged trades of 12 · 3 not judged yet · USD")).toBeVisible();
  const lines: [string, string, string][] = [
    ["Plan followed \\(Yes\\)", "6", "+$720.00"], ["Plan not followed \\(No or Partly\\)", "3", "-$280.00"], ["Not judged yet", "3", "-$100.00"],
    ["Actual result", "12", "+$340.00"], ["Result without the plan-breaking trades", "9", "+$620.00"],
  ];
  for (const [name, n, net] of lines) {
    await expect(row(page, name)).toContainText(n);
    await expect(row(page, name)).toContainText(net);
  }
  await expect(page.getByRole("img", { name: /^Bars: followed \+\$720\.00, not followed -\$280\.00, not judged -\$100\.00, actual \+\$340\.00, without the plan-breaking trades \+\$620\.00/ })).toBeVisible();
  await expect(page.getByText("Not judged yet is never guessed. Partly counts as not followed, because Partly never counts as following the plan.")).toBeVisible();
  await expect(page.getByText(/Only 9 of 12 trades are judged, so the edge leak covers just those\./)).toBeVisible();
  // the cost of each mistake: a trade with two tags is under both
  await expect(row(page, "Chased entry")).toContainText("-$240.00");
  await expect(row(page, "Moved stop")).toContainText("-$90.00");
  await expect(page.getByText("A trade with two mistakes counts under both, so these rows do not add up to a total.")).toBeVisible();
  await row(page, "Chased entry").getByRole("link").click();
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Mistake: Chased entry");
  await expect(page.locator("tbody tr")).toHaveCount(2);

  // judging a trade moves it out of "not judged yet"
  const tradeId = ref.trades["2026-10-02"];
  expect((await api("PUT", `/trades/${tradeId}/judgement`, { planFollowed: "yes" })).status).toBe(200);
  await page.goto(analyticsUrl(ref.id, "/replay"));
  await expect(page.getByText("Based on the 10 judged trades of 12 · 2 not judged yet · USD")).toBeVisible();
  await expect(row(page, "Plan followed \\(Yes\\)")).toContainText("-$90.00".slice(0, 0) + "7");

  // nothing judged at all
  const bare = await makeAccount(uniq("Replay"));
  for (const d of ["01", "02"]) await makeTrade(bare.id, { entryAt: `2026-10-${d}T09:41`, exitAt: `2026-10-${d}T09:58` });
  await page.goto(`/analytics/replay?${OCTOBER}&account=${bare.id}`);
  await expect(page.getByText("No trade judged yet.")).toBeVisible();
  await expect(page.getByText(/2 trades are waiting\./)).toBeVisible();
  await expect(page.getByRole("link", { name: "Judge the trades not judged yet" })).toBeVisible();
});
