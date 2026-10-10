import { expect, type Page } from "@playwright/test";
import { serviceToken } from "../scripts/session-mint.mjs";
import { OWNER_EMAIL } from "./auth";

// The API is reached directly only to set up data; everything under test goes through the browser.
export const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8081";

// With the gate on (feature 002) the API wants a signed service token, which the web tier normally adds; the secret is
// the test stack's own, passed in the environment by scripts/test.sh. `as` makes the call as another identity.
export async function api<T = any>(method: string, path: string, body?: unknown, as: string = OWNER_EMAIL): Promise<{ status: number; data: T }> {
  const token = serviceToken({ sub: as, secret: process.env.SERVICE_TOKEN_SECRET });
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => null)) as T };
}

/** A name that no earlier run has used, so specs never collide on the unique account name. */
export const uniq = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export async function makeAccount(name: string, currency = "USD", tradingDayStart?: string): Promise<{ id: string; name: string }> {
  const r = await api("POST", "/accounts", { name, currency, ...(tradingDayStart ? { tradingDayStart } : {}) });
  expect(r.status, JSON.stringify(r.data)).toBe(201);
  return { id: r.data.id, name };
}

/** Trade A of the quickstart: gross 100.00, net 95.40, risk 400.00, R 0.2385. Dates are in the past. */
export function tradeA(accountId: string, over: Record<string, unknown> = {}) {
  return {
    accountId,
    instrument: "NQ",
    direction: "long",
    size: "2",
    entryPrice: "21450.00",
    entryAt: "2025-10-01T09:41",
    exitPrice: "21452.50",
    exitAt: "2025-10-01T09:58",
    dollarsPerPoint: "20",
    cost: "4.60",
    stopPrice: "21440.00",
    ...over,
  };
}

export async function makeTrade(accountId: string, over: Record<string, unknown> = {}) {
  const r = await api("POST", "/trades", tradeA(accountId, over));
  expect(r.status, JSON.stringify(r.data)).toBe(201);
  return r.data;
}

/** The Trades list for one account with no date limits, so old test data is always on screen. */
export const tradesFor = (accountId: string, deleted = false) => `/trades?account=${accountId}&from=&to=${deleted ? "&deleted=1" : ""}`;

export async function hasNoAccounts(): Promise<boolean> {
  const r = await api<unknown[]>("GET", "/accounts?includeArchived=true");
  return r.data.length === 0;
}

/** Fills the form of a trade the way the owner types it. Fields left out stay as they are. */
export async function fillTrade(
  page: Page,
  f: Partial<{
    account: string; instrument: string; direction: "Long" | "Short"; size: string;
    entryPrice: string; entryDate: string; entryTime: string; exitPrice: string; exitDate: string; exitTime: string;
    dollarsPerPoint: string; cost: string; stopPrice: string; typedResult: string; thesis: string;
  }>,
) {
  if (f.account !== undefined) await page.getByLabel("Account", { exact: true }).selectOption({ label: f.account });
  if (f.instrument !== undefined) await page.getByLabel("Instrument").fill(f.instrument);
  if (f.direction) await page.getByText(f.direction, { exact: true }).click();
  if (f.size !== undefined) await page.getByLabel("Size", { exact: true }).fill(f.size);
  if (f.entryPrice !== undefined) await page.getByLabel("Entry price").fill(f.entryPrice);
  if (f.entryDate !== undefined && f.entryTime !== undefined) await page.getByLabel(/Entry time \(/).fill(`${f.entryDate} ${f.entryTime}`);
  if (f.exitPrice !== undefined) await page.getByLabel("Exit price").fill(f.exitPrice);
  if (f.exitDate !== undefined && f.exitTime !== undefined) await page.getByLabel(/Exit time \(/).fill(`${f.exitDate} ${f.exitTime}`);
  if (f.dollarsPerPoint !== undefined) await page.getByLabel(/Dollars per point/).fill(f.dollarsPerPoint);
  if (f.cost !== undefined) await page.getByLabel(/Costs \(total\)/).fill(f.cost);
  if (f.stopPrice !== undefined) await page.getByLabel(/Stop price/).fill(f.stopPrice);
  if (f.typedResult !== undefined) await page.getByLabel(/Result after costs/).fill(f.typedResult);
  if (f.thesis !== undefined) {
    const details = page.locator("details.details");
    if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await details.locator("summary").click();
    await page.getByLabel(/Why I took it/).fill(f.thesis);
  }
}

/** The result preview card, for assertions on its text. */
export const preview = (page: Page) => page.getByRole("region", { name: "Result preview" });

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;

/** Sets the Trades date range through the calendar: open it, show the month of each end, click the two days. */
export async function pickRange(page: Page, from: string, to: string) {
  const pop = page.locator(".range-popup");
  // the button may be clicked before the page has hydrated, so click until the calendar is open
  await expect(async () => {
    if (!(await pop.isVisible())) await page.getByLabel("Date range").click();
    await expect(pop).toBeVisible({ timeout: 1500 });
  }).toPass();
  for (const day of [from, to]) {
    const [y, m, d] = day.split("-").map(Number);
    await pop.getByLabel("Choose the Year").first().selectOption(String(y));
    await pop.getByLabel("Choose the Month").first().selectOption(String(m - 1));
    await pop.getByRole("button", { name: new RegExp(`, ${MONTHS[m - 1]} ${ordinal(d)}, ${y}`) }).first().click();
  }
  await expect(pop).toBeHidden();
}
