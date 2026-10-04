import { expect, test, type Page } from "@playwright/test";
import { api, makeAccount, tradeA } from "./helpers";
import { uniq } from "./helpers";

// SC-008, measured in the browser: with 5,000 trades across 10 accounts, opening the trades list, changing a filter and
// saving a trade each take under one second. The 5,000 trades are spread over twelve months of 2025, so the list the
// owner opens (one month, as the page does by default) holds about 420 of them.
// The whole journal, unfiltered, is measured too. Lists are paged at 200 trades (added at the visual review).

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
  await page.getByLabel(/Entry time \(/).fill("2025-06-15 09:00");
  await page.getByLabel("Exit price").fill("101");
  await page.getByLabel(/Exit time \(/).fill("2025-06-15 09:30");
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
  await expect(page.getByText(/Showing 1 to 200 of 4\d\d/)).toBeVisible(); // a month of the seeded data, in pages of 200

  const filter = await timed(async () => {
    await page.getByLabel("Account", { exact: true }).selectOption({ value: accounts[3].id });
    await expect(page.locator("tbody tr")).not.toHaveCount(rows);
  });
  const save = await saveATrade(page);

  console.log(`SC-008: open a month of ${rows} trades ${open} ms, change a filter ${filter} ms, save a trade ${save} ms`);
  expect.soft(rows, "the first page").toBe(200);
  expect.soft(open, "open the list").toBeLessThan(1000);
  expect.soft(filter, "change a filter").toBeLessThan(1000);
  expect.soft(save, "save a trade").toBeLessThan(1000);
});

test("the whole journal of 5,000 trades, unfiltered, opens its first page and pages through it in under a second", async ({ page }) => {
  const open = await timed(async () => {
    await page.goto("/trades?from=&to=");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
  await expect(page.getByText(/Showing 1 to 200 of [\d,]{5,}/)).toBeVisible();
  const older = await timed(async () => {
    await page.getByRole("link", { name: "Older" }).click();
    await expect(page.getByText(/Showing 201 to 400 of/)).toBeVisible();
  });
  console.log(`SC-008 whole journal: first page ${open} ms, next page ${older} ms`);
  expect.soft(open, "open the whole list").toBeLessThan(1000);
  expect.soft(older, "next page").toBeLessThan(1000);
});
