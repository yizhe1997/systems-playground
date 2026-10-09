import { expect, test } from "@playwright/test";
import { api, makeAccount, makeTrade, pickRange, tradeA, tradesFor, uniq } from "./helpers";

async function twoAccountsWithTrades() {
  const a = await makeAccount(uniq("Alpha"));
  const b = await makeAccount(uniq("Beta"), "EUR");
  await makeTrade(a.id, { instrument: "AA1", entryAt: "2025-10-01T09:00", exitAt: "2025-10-01T09:30" });
  await makeTrade(a.id, { instrument: "AA2", entryAt: "2025-10-03T09:00", exitAt: "2025-10-03T09:30" });
  await makeTrade(b.id, { instrument: "BB1", entryAt: "2025-10-02T09:00", exitAt: "2025-10-02T09:30" });
  return { a, b };
}

test("filter by account and by date range; Clear filters; newest first", async ({ page }) => {
  const { a, b } = await twoAccountsWithTrades();
  await page.goto("/trades?from=&to=");
  await page.getByLabel("Account", { exact: true }).selectOption({ value: a.id });
  await expect(page).toHaveURL(new RegExp(`account=${a.id}`));
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("AA2"); // newest exit first
  await expect(rows.nth(1)).toContainText("AA1");

  await pickRange(page, "2025-10-02", "2025-10-05");
  await expect(page.getByLabel("Date range")).toHaveText("2 Oct 2025 – 5 Oct 2025");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("AA2");

  await pickRange(page, "2025-10-02", "2025-10-02"); // one day: the same day clicked twice
  await expect(page.getByText("No trades for these filters.")).toBeVisible();
  await expect(page.getByText("Try another account or a wider date range.")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).last().click();
  await expect(page.getByText("AA1").first()).toBeVisible();

  // the currency of each account stays its own
  await page.goto(tradesFor(b.id));
  await expect(page.locator("tbody tr").first()).toContainText("€");
});

test("a given day is reachable in three actions (SC-006)", async ({ page }) => {
  const { a } = await twoAccountsWithTrades();
  await page.goto(`/accounts`); // start somewhere else
  await page.getByRole("link", { name: "Trades" }).click(); // 1
  await pickRange(page, "2025-10-03", "2025-10-03"); // 2: set the range (the account is already All accounts)
  await expect(page.locator("tbody tr")).not.toHaveCount(0);
  await expect(page.locator("tbody tr").first()).toContainText("Fri 3 Oct");
  void a;
});

test("Export downloads one file named with the date, and its count equals the screen count with deleted shown", async ({ page }) => {
  const { a } = await twoAccountsWithTrades();
  const doomed = await makeTrade(a.id, { instrument: "DD1" });
  await api("DELETE", `/trades/${doomed.id}`);

  await page.goto("/trades?from=&to=");
  const live = await page.locator("tbody tr").count();
  await page.getByText("Show deleted").click();
  await expect(page.getByText("Showing deleted trades.")).toBeVisible();
  const deleted = await page.locator("tbody tr").count();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^tradecraft-export-\d{4}-\d{2}-\d{2}\.json$/);
  const body = JSON.parse(await (await import("node:fs/promises")).readFile((await download.path())!, "utf8"));
  expect(body.trades.length).toBe(live + deleted);
  expect(body.accounts.length).toBeGreaterThan(0);
  expect(body.trades.some((t: { deleted: boolean }) => t.deleted)).toBe(true);
});

test("a fresh month shows the current month by default", async ({ page }) => {
  await page.goto("/trades");
  // the range button reads "1 Oct 2026 – 31 Oct 2026": the first to the last day of one month
  const text = await page.getByLabel("Date range").innerText();
  const m = text.match(/^1 (\w{3}) (\d{4}) – (28|29|30|31) (\w{3}) (\d{4})$/);
  expect(m, text).not.toBeNull();
  expect([m![1], m![2]]).toEqual([m![4], m![5]]);
});

test("long lists are paged at 200: Showing x to y of n, Newer and Older", async ({ page }) => {
  const acct = await makeAccount(uniq("Pages"));
  const jobs: Array<() => Promise<unknown>> = [];
  for (let n = 0; n < 205; n++) {
    const day = String(1 + (n % 28)).padStart(2, "0");
    const min = String(10 + (n % 40)).padStart(2, "0");
    jobs.push(() => api("POST", "/trades", tradeA(acct.id, { entryAt: `2025-08-${day}T09:00`, exitAt: `2025-08-${day}T09:${min}` })));
  }
  await Promise.all(Array.from({ length: 10 }, async () => { for (let j = jobs.shift(); j; j = jobs.shift()) await j(); }));

  await page.goto(tradesFor(acct.id));
  await expect(page.getByText("Showing 1 to 200 of 205")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(200);
  await expect(page.getByText("Newer", { exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("link", { name: "Older" }).click();
  await expect(page.getByText("Showing 201 to 205 of 205")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("link", { name: "Newer" }).click();
  await expect(page.getByText("Showing 1 to 200 of 205")).toBeVisible();

  // changing a filter starts again at the first page
  await page.getByRole("link", { name: "Older" }).click();
  await pickRange(page, "2025-08-10", "2025-08-31");
  await expect(page).not.toHaveURL(/page=/);
  // a short list shows no pager
  await page.goto(`/trades?account=${acct.id}&from=2025-08-27&to=2025-08-28`);
  await expect(page.getByLabel("Pages of trades")).toBeHidden();
});
