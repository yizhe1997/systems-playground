import { expect, test } from "@playwright/test";
import { api, makeAccount, makeTrade, tradesFor, uniq } from "./helpers";

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

  await page.getByLabel("From").fill("2025-10-02");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("AA2");

  await page.getByLabel("To").fill("2025-10-02");
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
  await page.getByLabel("From").fill("2025-10-03"); // 2
  await page.getByLabel("To").fill("2025-10-03"); // 3
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
  const from = await page.getByLabel("From").inputValue();
  const to = await page.getByLabel("To").inputValue();
  expect(from).toMatch(/^\d{4}-\d{2}-01$/);
  expect(to).toMatch(/^\d{4}-\d{2}-(28|29|30|31)$/);
  expect(from.slice(0, 7)).toBe(to.slice(0, 7));
});
