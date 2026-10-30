import { expect, test, type Page } from "@playwright/test";
import { api, makeAccount, makeTrade, uniq } from "./helpers";
import { homeUrl, referenceMonth } from "./helpers_analytics";

// a headline card by its title (the definitions mention the other statistics, so a text match would find them all)
const card = (page: Page, title: string, block = "Headline figures, USD") =>
  page.getByRole("group", { name: block }).locator(".home-card").filter({ has: page.locator("summary", { hasText: new RegExp(`^${title}$`) }) });

// Feature 005, user story 1 (screen H1): Home, the landing page, on the reference month of the quickstart.

test("the root address is Home and the sidebar has it first, with Reviews still there", async ({ page }) => {
  await referenceMonth();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  const items = await page.getByRole("navigation", { name: "Main" }).getByRole("link").allInnerTexts();
  expect(items.slice(0, 2).map((t) => t.trim())).toEqual(["Home", "Reviews"]);
  expect(items.map((t) => t.trim())).toContain("Analytics");
});

test("the five cards of the reference month, each with its plan figure, definition and sample", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(homeUrl(ref.id));
  const cards = page.getByRole("group", { name: "Headline figures, USD" });
  await expect(cards.locator(".home-card")).toHaveCount(5);
  const net = card(page, "Net result");
  await expect(net).toContainText("+$340.00");
  await expect(net).toContainText("12 trades · USD");
  await expect(net).toContainText("Plan followed 6 of 12 (3 not judged)");
  await expect(cards.locator(".home-card").nth(1)).toContainText("n = 12 · 9 judged");
  const win = card(page, "Win rate");
  await expect(win).toContainText("7 of 12 (58%)");
  await expect(win).toContainText("n = 12");
  const pf = card(page, "Profit factor");
  await expect(pf).toContainText("1.77");
  await expect(pf).toContainText("$780.00 won / $440.00 lost");
  const ex = card(page, "Expectancy");
  await expect(ex).toContainText("+$28.33");
  await expect(ex).toContainText("per trade · n = 12");
  await expect(ex).toContainText("In R: +0.31 R · 8 of 12 trades");
  // every card has the plan figure (constitution I)
  for (const c of await cards.locator(".home-card").all()) await expect(c).toContainText("Plan followed 6 of 12");
  await expect(page.getByText("Each card has its definition: select the card title. Results are in USD; this page has no totals across currencies.")).toBeVisible();
  // a definition opens from the card title
  await pf.getByText("Profit factor").click();
  await expect(pf).toContainText("The sum of the net results of the winning trades divided by the sum of the net results of the losing trades");
});

test("the curve, the daily bars and the calendar say it in words and the table gives the same numbers", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(homeUrl(ref.id));
  await expect(page.getByRole("img", { name: /^Equity curve: line from \$0\.00 to \+\$340\.00 over 12 trading days, lowest point -\$60\.00 on Tue 6 Oct/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Daily bars: 12 trading days, from -\$150\.00 \(Tue 6 Oct\) to \+\$200\.00 \(Thu 8 Oct\)/ })).toBeVisible();
  await page.getByText("View as table").first().click();
  const rows = page.locator(".chart-table table tbody tr");
  await expect(rows).toHaveCount(12);
  await expect(rows.nth(3)).toContainText("Tue 6 Oct 2026");
  await expect(rows.nth(3)).toContainText("-$60.00");
  // the calendar: each trading day says its result and plan figure; weekends have no column
  const cal = page.getByRole("region", { name: "Calendar" });
  await expect(cal.getByText("Sat", { exact: true })).toHaveCount(0);
  const oct6 = cal.getByRole("link", { name: /^2026-10-06:/ });
  await expect(oct6).toContainText("-$150.00");
  await expect(oct6).toContainText("Plan 0 of 1");
  await expect(cal.getByRole("link", { name: /^2026-10-02:/ })).toContainText("Not judged");
  await expect(cal.getByRole("link", { name: /^2026-10-12:/ })).toContainText("Plan 0 of 1 (partly)");
  await expect(cal.getByText("Select a day to open its daily review. Colour is not used: the border marks days with trades.")).toBeVisible();
  // selecting a day opens its daily review
  await oct6.click();
  await expect(page).toHaveURL(new RegExp(`/reviews/day\\?account=${ref.id}&date=2026-10-06`));
  await expect(page.getByRole("heading", { name: "Daily review" })).toBeVisible();
});

test("changing the period and the account changes everything together and the address holds the choice", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(homeUrl(ref.id));
  await expect(page.getByRole("group", { name: "Headline figures, USD" })).toContainText("+$340.00");
  // October ends on the 31st: choose the custom range 1 to 9 Oct through the address, then a preset through the control
  await page.goto(`/?period=custom&from=2026-10-01&to=2026-10-09&account=${ref.id}`);
  const net = card(page, "Net result");
  await expect(net).toContainText("+$220.00"); // the first six trades: 120 - 90 + 60 - 150 + 200 + 80
  await expect(net).toContainText("6 trades");
  // the Period control is a link: choosing "Last 30 days" puts it in the address
  await page.getByLabel("Period").selectOption("last30");
  await expect(page).toHaveURL(/period=last30/);
  await expect(page).toHaveURL(new RegExp(`account=${ref.id}`));
  await page.reload();
  await expect(page.getByLabel("Period")).toHaveValue("last30");
});

test("accounts in two currencies are two blocks and nothing is added across", async ({ page }) => {
  const ref = await referenceMonth("RefUsd");
  const eur = await makeAccount(uniq("RefEur"), "EUR");
  await makeTrade(eur.id, { entryAt: "2026-10-14T09:41", exitAt: "2026-10-14T09:58", entryPrice: "1000", exitPrice: "1100", dollarsPerPoint: "1", stopPrice: "900", size: "1", cost: "0" });
  expect(ref.id).not.toBe(eur.id);
  // the whole journal of October 2026 in both accounts: use the two accounts one after the other (a scope is one account or all)
  await page.goto(`/?period=custom&from=2026-10-01&to=2026-10-31`);
  await expect(page.getByText(/Your accounts use \d+ currencies\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: "EUR accounts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "USD accounts" })).toBeVisible();
  await expect(card(page, "Net result", "Headline figures, EUR")).toContainText("€");
  await expect(card(page, "Net result")).toContainText("$");
});

test("an empty period and a journal with only unjudged trades say so plainly", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(`/?period=custom&from=2019-01-01&to=2019-12-31&account=${ref.id}`);
  await expect(page.getByText("No trades in this period.")).toBeVisible();
  await expect(page.getByText(/You have 12 trades in other periods\. Choose another period\./)).toBeVisible();
  await expect(page.getByRole("link", { name: "Show all time" })).toBeVisible();
  // an account whose trades are all unjudged
  const bare = await makeAccount(uniq("Unjudged"));
  for (const d of ["01", "02", "05"]) await makeTrade(bare.id, { entryAt: `2026-10-${d}T09:41`, exitAt: `2026-10-${d}T09:58` });
  await page.goto(homeUrl(bare.id));
  await expect(page.getByText("None of these 3 trades is judged yet.")).toBeVisible();
  const net = card(page, "Net result");
  await expect(net).toContainText("Plan followed 0 of 3 (3 not judged)");
  // R is a dash with its reason only on the Expectancy card's second line; the money figure is there
  const ex = card(page, "Expectancy");
  await expect(ex).toContainText("per trade · n = 3");
  // the account is real: the API agrees with the screen
  const r = await api("GET", `/analytics?from=2026-10-01&to=2026-10-31&accountId=${bare.id}`);
  expect(r.data.blocks[0].trades).toBe(3);
});

// Feature 005, user story 4: what is waiting for the owner, from the same states as the Reviews screens.
test("Needs you lists the missing days, the trades not judged yet and the unreviewed weeks, and each fix removes its line", async ({ page }) => {
  const ref = await referenceMonth();
  await page.goto(homeUrl(ref.id));
  const needs = page.getByRole("region", { name: "Needs you" });
  await expect(needs.getByText("12 days missing a review")).toBeVisible();
  await expect(needs.getByText("3 trades not judged yet")).toBeVisible();
  await expect(needs.getByText(/\d+ weeks? not marked reviewed/)).toBeVisible();
  await expect(needs.getByText(/and 7 more/)).toBeVisible(); // 12 days, 5 shown
  // the newest missing day is the 27th and opens its daily review
  await needs.getByRole("link", { name: "Tue 27 Oct", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/reviews/day\\?account=${ref.id}&date=2026-10-27`));
  // judging the trade of the 27th and the 15th and 2nd: the line goes
  for (const d of ["2026-10-27", "2026-10-15", "2026-10-02"]) expect((await api("PUT", `/trades/${ref.trades[d]}/judgement`, { planFollowed: "yes" })).status).toBe(200);
  await page.goto(homeUrl(ref.id));
  await expect(page.getByRole("region", { name: "Needs you" }).getByText(/trades? not judged yet/)).toHaveCount(0);
  // a Backtest account never shows a Missing day
  const bt = await makeAccount(uniq("BtNeeds"), "USD", undefined, "backtest");
  await makeTrade(bt.id, { entryAt: "2026-10-14T09:41", exitAt: "2026-10-14T09:58" });
  await page.goto(`/?period=custom&from=2026-10-01&to=2026-10-31&account=${bt.id}`);
  await expect(page.getByRole("region", { name: "Needs you" }).getByText(/missing a review/)).toHaveCount(0);
});
