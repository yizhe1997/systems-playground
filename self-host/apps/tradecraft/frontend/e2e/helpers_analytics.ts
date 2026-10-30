import { expect } from "@playwright/test";
import { api, makeAccount, uniq } from "./helpers";

// The reference month of specs/005-home-and-analytics/quickstart.md: twelve USD trades in October 2026 with a plan
// answer on nine of them (net +340.00, 7 wins of 12, plan followed 6 of 12). The e2e journal is shared by every spec, so
// the whole month goes into ONE account and the screens are opened on that account.
type Spec = { day: string; time: string; dir: "long" | "short"; instrument: string; net: number; risk: number; plan: "yes" | "partly" | "no" | ""; tags?: string[] };

export const REFERENCE: Spec[] = [
  { day: "2026-10-01", time: "09:41", dir: "long", instrument: "NQ", net: 120, risk: 200, plan: "yes" },
  { day: "2026-10-02", time: "10:14", dir: "long", instrument: "ES", net: -90, risk: 0, plan: "" },
  { day: "2026-10-05", time: "09:41", dir: "long", instrument: "NQ", net: 60, risk: 200, plan: "yes" },
  { day: "2026-10-06", time: "10:14", dir: "short", instrument: "NQ", net: -150, risk: 100, plan: "no", tags: ["Chased entry"] },
  { day: "2026-10-08", time: "09:41", dir: "long", instrument: "NQ", net: 200, risk: 100, plan: "yes" },
  { day: "2026-10-09", time: "09:41", dir: "long", instrument: "NQ", net: 80, risk: 200, plan: "yes" },
  { day: "2026-10-12", time: "10:14", dir: "short", instrument: "ES", net: -40, risk: 0, plan: "partly" },
  { day: "2026-10-13", time: "09:41", dir: "long", instrument: "NQ", net: 110, risk: 200, plan: "yes" },
  { day: "2026-10-15", time: "09:41", dir: "long", instrument: "ES", net: -70, risk: 0, plan: "" },
  { day: "2026-10-20", time: "10:14", dir: "long", instrument: "NQ", net: 150, risk: 200, plan: "yes" },
  { day: "2026-10-22", time: "10:14", dir: "short", instrument: "NQ", net: -90, risk: 150, plan: "no", tags: ["Chased entry", "Moved stop"] },
  { day: "2026-10-27", time: "10:14", dir: "long", instrument: "ES", net: 60, risk: 0, plan: "" },
];

export const OCTOBER = "period=custom&from=2026-10-01&to=2026-10-31";

/** Creates an account with the reference month (all in one account) and answers its plan questions and tags. */
export async function referenceMonth(prefix = "Ref") {
  const acct = await makeAccount(uniq(prefix));
  const tag = async (name: string) => {
    const list = await api<{ id: string; name: string }[]>("GET", "/mistakes?includeRetired=true");
    const found = list.data.find((m) => m.name === name);
    if (found) return found.id;
    const made = await api<{ id: string }>("POST", "/mistakes", { name });
    expect(made.status).toBe(201);
    return made.data.id;
  };
  const ids: Record<string, string> = {};
  for (const s of REFERENCE) {
    const entry = 1000;
    const exit = s.dir === "long" ? entry + s.net : entry - s.net;
    const body: Record<string, unknown> = {
      accountId: acct.id, instrument: s.instrument, direction: s.dir, size: "1", cost: "0", dollarsPerPoint: "1",
      entryPrice: String(entry), exitPrice: String(exit), entryAt: `${s.day}T${s.time}`, exitAt: `${s.day}T${s.time.startsWith("09") ? "09:58" : "10:31"}`,
    };
    if (s.risk > 0) body.stopPrice = String(s.dir === "long" ? entry - s.risk : entry + s.risk);
    const r = await api<{ id: string }>("POST", "/trades", body);
    expect(r.status, JSON.stringify(r.data)).toBe(201);
    if (s.plan || s.tags) {
      const mistakeIds: string[] = [];
      for (const t of s.tags ?? []) mistakeIds.push(await tag(t));
      const j = await api("PUT", `/trades/${r.data.id}/judgement`, { planFollowed: s.plan || null, label: mistakeIds.length ? "mistake" : null, mistakeIds });
      expect(j.status, JSON.stringify(j.data)).toBe(200);
    }
    ids[s.day] = r.data.id;
  }
  return { ...acct, trades: ids };
}

export const homeUrl = (accountId: string, extra = "") => `/?${OCTOBER}&account=${accountId}${extra}`;
export const analyticsUrl = (accountId: string, tab: "" | "/replay" = "", extra = "") => `/analytics${tab}?${OCTOBER}&account=${accountId}${extra}`;
