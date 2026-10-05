import { expect } from "@playwright/test";
import { api, makeAccount, uniq } from "./helpers";

/** The three-trade sample day of specs/001-journal-and-reflect/quickstart.md (Wed 1 Oct 2025, a 17:00 account): net +45.00. */
export async function sampleDay(prefix = "Review") {
  const acct = await makeAccount(uniq(prefix), "USD", "17:00");
  const mk = async (entry: string, exit: string, entryPrice: string, exitPrice: string) => {
    const r = await api("POST", "/trades", {
      accountId: acct.id, instrument: "NQ", direction: "long", size: "1", cost: "0", dollarsPerPoint: "20",
      entryAt: entry, exitAt: exit, entryPrice, exitPrice,
    });
    expect(r.status, JSON.stringify(r.data)).toBe(201);
    return r.data.id as string;
  };
  return {
    ...acct,
    w: await mk("2025-10-01T09:41", "2025-10-01T09:58", "21450.00", "21465.00"),
    l1: await mk("2025-10-01T10:14", "2025-10-01T10:31", "21500.00", "21493.75"),
    l2: await mk("2025-10-01T10:40", "2025-10-01T10:52", "21500.00", "21493.50"),
  };
}

export const reviewsUrl = (accountId: string, month = "2025-10") => `/reviews?account=${accountId}&month=${month}`;
export const dayUrl = (accountId: string, date = "2025-10-01") => `/reviews/day?account=${accountId}&date=${date}`;

/** Sets the three answers on a daily review. */
export async function answer(page: import("@playwright/test").Page, a: { didWell?: string; couldImprove?: string; nextFocus?: string }) {
  if (a.didWell !== undefined) await page.getByLabel("What did I do well today?").fill(a.didWell);
  if (a.couldImprove !== undefined) await page.getByLabel("What could I improve on?").fill(a.couldImprove);
  if (a.nextFocus !== undefined) await page.getByLabel("What will I focus on next session?").fill(a.nextFocus);
}
