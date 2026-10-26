import { expect, test, type Page } from "@playwright/test";
import { api, makeAccount, makePng, tradeA, uploadImage } from "./helpers";
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
    await page.goto("/trades?from=2025-06-01&to=2025-06-30&size=100");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
  const rows = await page.locator("tbody tr").count();
  await expect(page.getByText(/Showing 1 to 100 of 4\d\d/)).toBeVisible(); // a month of the seeded data, in the largest page

  const filter = await timed(async () => {
    await page.getByLabel("Account", { exact: true }).selectOption({ value: accounts[3].id });
    await expect(page.locator("tbody tr")).not.toHaveCount(rows);
  });
  const save = await saveATrade(page);

  console.log(`SC-008: open a month of ${rows} trades ${open} ms, change a filter ${filter} ms, save a trade ${save} ms`);
  expect.soft(rows, "the first page").toBe(100);
  expect.soft(open, "open the list").toBeLessThan(1000);
  expect.soft(filter, "change a filter").toBeLessThan(1000);
  expect.soft(save, "save a trade").toBeLessThan(1000);
});

test("the whole journal of 5,000 trades, unfiltered, opens its first page and pages through it in under a second", async ({ page }) => {
  const open = await timed(async () => {
    await page.goto("/trades?from=&to=&size=100");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
  await expect(page.getByText(/Showing 1 to 100 of [\d,]{5,}/)).toBeVisible();
  const older = await timed(async () => {
    await page.getByRole("link", { name: "Older" }).click();
    await expect(page.getByText(/Showing 101 to 200 of/)).toBeVisible();
  });
  console.log(`SC-008 whole journal: first page ${open} ms, next page ${older} ms`);
  expect.soft(open, "open the whole list").toBeLessThan(1000);
  expect.soft(older, "next page").toBeLessThan(1000);
});

// SC-008 for feature 001, in the browser, on the same 5,000 trades: the review screens open and save in under a second.
test("the review screens on 5,000 trades: Reviews, a day, a week, the counter, a review and a judgement", async ({ page }) => {
  const a = accounts[0].id;
  const month = "2025-06";
  const open = async (url: string, ready: () => Promise<void>) => timed(async () => { await page.goto(url); await ready(); });

  const reviews = await open(`/reviews?account=${a}&month=${month}`, () => expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible());
  const changeMonth = await timed(async () => {
    await page.getByLabel("Jump to date").fill("2025-05-15");
    await expect(page).toHaveURL(/month=2025-05/);
    await expect(page.locator(".week").first()).toBeVisible();
  });
  const days = await api("GET", `/reviews?accountId=${a}&month=${month}`);
  const day = days.data.weeks.flatMap((w: any) => w.days).find((d: any) => d.trades > 0).date as string;
  const dayOpen = await open(`/reviews/day?account=${a}&date=${day}`, () => expect(page.getByRole("heading", { name: "Daily review" })).toBeVisible());
  const week = await open(`/reviews/week?account=${a}&date=${day}`, () => expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible());
  const counter = await open(`/mistakes?period=month&date=${day}`, () => expect(page.getByRole("heading", { name: "Mistakes", exact: true })).toBeVisible());

  await page.goto(`/reviews/day?account=${a}&date=${day}`);
  await page.getByLabel("What did I do well today?").fill("Waited for the retest.");
  const saveReview = await timed(async () => {
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Last saved/)).toBeVisible();
  });
  await page.getByRole("button", { name: /^Judge / }).first().click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Yes").check();
  const saveJudgement = await timed(async () => {
    await drawer.getByRole("button", { name: "Save", exact: true }).click();
    await expect(drawer).toBeHidden();
  });

  console.log(`SC-008 reviews: Reviews ${reviews} ms, change month ${changeMonth} ms, a day ${dayOpen} ms, a week ${week} ms, the counter ${counter} ms, save a review ${saveReview} ms, save a judgement ${saveJudgement} ms`);
  for (const [name, ms] of Object.entries({ reviews, changeMonth, dayOpen, week, counter, saveReview, saveJudgement })) expect.soft(ms, name).toBeLessThan(1000);
});

// Feature 004 (SC-007): with images on the trades, the same lists still open in under a second. Runs last, so the images
// it adds do not change the figures above. Each list reads one aggregate count (never a picture); the picture
// itself is fetched by the drawer from the bucket.
test("with images attached: the month list of 5,000 trades, a day's review and its drawer stay under a second", async ({ page }) => {
  test.setTimeout(240_000);
  const a = accounts[0].id;
  const day = (await api("GET", `/reviews?accountId=${a}&month=2025-06`)).data.weeks.flatMap((w: any) => w.days).find((d: any) => d.trades > 0).date as string;
  const list = await api("GET", `/trades?from=2025-06-01&to=2025-06-30&limit=100`);
  const ids: string[] = list.data.map((t: any) => t.id);
  const png = makePng(640, 360);
  const jobs = ids.map((id) => async () => { for (let i = 0; i < 3; i++) expect((await uploadImage(id, png, `chart ${i}.png`)).status).toBe(201); });
  await Promise.all(Array.from({ length: 10 }, async () => { for (let j = jobs.shift(); j; j = jobs.shift()) await j(); }));

  const open = await timed(async () => {
    await page.goto("/trades?from=2025-06-01&to=2025-06-30&size=100");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^3 images on / }).first()).toBeVisible();
  });
  const dayOpen = await timed(async () => {
    await page.goto(`/reviews/day?account=${a}&date=${day}`);
    await expect(page.getByRole("heading", { name: "Daily review" })).toBeVisible();
  });
  // every trade of that day gets pictures, then the drawer of the first is timed
  for (const t of (await api("GET", `/reviews/day?accountId=${a}&date=${day}`)).data.trades) {
    for (let i = 0; i < 3; i++) if (t.imageCount === 0) expect((await uploadImage(t.id, png, `day ${i}.png`)).status).toBe(201);
  }
  await page.reload();
  await page.getByRole("button", { name: /^Judge / }).first().click();
  const drawer = await timed(async () => { await expect(page.getByRole("button", { name: /^View / }).first()).toBeVisible(); });
  console.log(`SC-007 with images: month list ${open} ms, a day ${dayOpen} ms, pictures in the drawer ${drawer} ms`);
  expect.soft(open, "month list with images").toBeLessThan(1000);
  expect.soft(dayOpen, "a day with images").toBeLessThan(1000);
  expect.soft(drawer, "pictures in the drawer").toBeLessThan(1000);
});
