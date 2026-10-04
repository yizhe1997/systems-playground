import { expect, test, type Page } from "@playwright/test";
import { api, makeAccount, tradeA } from "./helpers";
import { uniq } from "./helpers";

// SC-008, measured in the browser: with 5,000 trades across 10 accounts, opening the trades list, changing a filter and
// saving a trade each take under one second. The 5,000 trades are spread over twelve months of 2025, so the list the
// owner opens (one month, as the page does by default) holds about 420 of them.
// The whole journal at once, unfiltered, is measured separately: it is the worst case and is reported, not promised.

const accounts: { id: string; name: string }[] = [];

test.beforeAll(async () => {
  test.setTimeout(240_000);
  for (let i = 0; i < 10; i++) accounts.push(await makeAccount(uniq(`Scale${i}`)));
  const jobs: Array<() => Promise<unknown>> = [];
  for (let n = 0; n < 5000; n++) {
    const month = String(1 + (n % 12)).padStart(2, "0");
    const day = String(1 + (Math.floor(n / 12) % 28)).padStart(2, "0");
    const hour = String(9 + (n % 8)).padStart(2, "0");
    const min = String(n % 60).padStart(2, "0");
    jobs.push(() => api("POST", "/trades", tradeA(accounts[n % 10].id, { entryAt: `2025-${month}-${day}T${hour}:00`, exitAt: `2025-${month}-${day}T${hour}:${min}` })));
  }
  const started = Date.now();
  await Promise.all(Array.from({ length: 20 }, async () => { for (let j = jobs.shift(); j; j = jobs.shift()) await j(); }));
  console.log(`seeded 5,000 trades in ${Date.now() - started} ms`);
});

async function timed(f: () => Promise<void>): Promise<number> {
  const t0 = Date.now();
  await f();
  return Date.now() - t0;
}

async function saveATrade(page: Page) {
  await page.goto("/trades/new");
  await page.getByLabel("Account", { exact: true }).selectOption({ value: accounts[0].id });
  await page.getByLabel("Instrument").fill("NQ");
  await page.getByText("Long", { exact: true }).click();
  await page.getByLabel("Size", { exact: true }).fill("1");
  await page.getByLabel("Entry price").fill("100");
  await page.getByLabel("Entry date").fill("2025-06-15");
  await page.getByLabel(/Entry time of day/).fill("09:00");
  await page.getByLabel("Exit price").fill("101");
  await page.getByLabel("Exit date").fill("2025-06-15");
  await page.getByLabel(/Exit time of day/).fill("09:30");
  await page.getByLabel(/Dollars per point/).fill("10");
  return timed(async () => {
    await page.getByRole("button", { name: "Save trade" }).click();
    await expect(page).toHaveURL(/\/trades\?from=2025-06-01/);
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
}

test("5,000 trades: open a month, change a filter, save a trade, each under one second", async ({ page }) => {
  const open = await timed(async () => {
    await page.goto("/trades?from=2025-06-01&to=2025-06-30");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
  const rows = await page.locator("tbody tr").count();

  const filter = await timed(async () => {
    await page.getByLabel("Account", { exact: true }).selectOption({ value: accounts[3].id });
    await expect(page.locator("tbody tr")).not.toHaveCount(rows);
  });
  const save = await saveATrade(page);

  console.log(`SC-008: open a month of ${rows} trades ${open} ms, change a filter ${filter} ms, save a trade ${save} ms`);
  expect.soft(rows, "a month of the seeded data").toBeGreaterThan(300);
  expect.soft(open, "open the list").toBeLessThan(1000);
  expect.soft(filter, "change a filter").toBeLessThan(1000);
  expect.soft(save, "save a trade").toBeLessThan(1000);
});

test("worst case: the whole journal of 5,000 trades on one screen (reported, not promised)", async ({ page }) => {
  const open = await timed(async () => {
    await page.goto("/trades?from=&to=");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
  const rows = await page.locator("tbody tr").count();
  console.log(`SC-008 worst case: the whole list of ${rows} trades opens in ${open} ms (target for a month: under 1000 ms)`);
  expect(rows).toBeGreaterThanOrEqual(5000);
  expect(open, "a regression guard, not the SC-008 target").toBeLessThan(8000);
});
