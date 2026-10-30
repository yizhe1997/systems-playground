// Home and Analytics (feature 005): the shapes of GET /analytics and GET /needs-you, and the period and scope of a view.
// A view is only the address (period, from, to, account, band): nothing about it is stored.

import { dayLabel, monthName, todayIn, weekRange } from "@/lib/format";

export type Plan = { followed: number; partly: number; notFollowed: number; notJudged: number; of: number };

export type Statistic = {
  key: "netResult" | "winRate" | "profitFactor" | "expectancy" | "expectancyR" | "averageWin" | "averageLoss" | "payoffRatio" | "largestWin" | "largestLoss" | "maxDrawdown" | "winStreak" | "lossStreak";
  label: string;
  value: string | null;
  wins?: number;
  counted?: number;
  setAside?: number;
  percent?: number;
  day?: string;
  peakDay?: string | null;
  troughDay?: string;
  peak?: string;
  trough?: string;
  from?: string;
  to?: string;
  n: number;
  plan: Plan;
  reason: string | null;
  few: boolean;
  definitionKey: string;
  definition: string;
  detail?: Record<string, string>;
};

export type CurvePoint = { day: string; result: string; cumulative: string };
export type CalendarDay = { day: string; trades: number; result: string; plan: Plan; openAccountId: string };
export type BreakdownRow = { key: string; label: string; trades: number; netResult: string | null; wins: number; counted: number; plan: Plan; few: boolean };
export type ReplayLine = { key: "followed" | "notFollowed" | "notJudged" | "actual" | "without"; trades: number; netResult: string };
export type MistakeCost = { mistakeId: string; name: string; trades: number; netResult: string; plan: Plan; records: number };

export type Block = {
  currency: string;
  accounts: { id: string; name: string; kind: "live" | "backtest"; archived: boolean }[];
  trades: number;
  plan: Plan;
  statistics: Statistic[];
  curve: CurvePoint[];
  days: CalendarDay[];
  breakdowns: { weekday: BreakdownRow[]; hour: BreakdownRow[]; instrument: BreakdownRow[]; direction: BreakdownRow[]; account: BreakdownRow[] };
  replay: { judged: number; of: number; lines: ReplayLine[] };
  mistakeCost: MistakeCost[];
};

export type Analytics = { from: string; to: string; accountId: string | null; band: string; timeZone: string; blocks: Block[]; otherPeriods: number };

export type NeedsYou = {
  missingDays: { total: number; items: { accountId: string; accountName: string; day: string; trades: number }[] };
  notJudged: { total: number; items: { tradeId: string; accountId: string; accountName: string; instrument: string; direction: string; entryAt: string; tradingDay: string }[] };
  missingWeeks: { total: number; items: { accountId: string; accountName: string; weekStart: string; weekEnd: string }[] };
};

export const stat = (b: Block, key: Statistic["key"]) => b.statistics.find((s) => s.key === key)!;

// ---------- the view: period, accounts, band ----------

export type Period = "week" | "month" | "last30" | "year" | "all" | "custom";
const PERIODS: Period[] = ["week", "month", "last30", "year", "all", "custom"];

export type View = { period: Period; from: string; to: string; account: string; band: string; error: string | null };

const day = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(s + "T00:00:00Z");
export const addDays = (s: string, n: number) => {
  const d = utc(s);
  d.setUTCDate(d.getUTCDate() + n);
  return day(d);
};

/** The first and last trading day of a preset, read from today's date in the journal time zone. */
export function presetRange(period: Exclude<Period, "custom">, today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  switch (period) {
    case "week": {
      const wd = (utc(today).getUTCDay() + 6) % 7; // Monday = 0
      const from = addDays(today, -wd);
      return { from, to: addDays(from, 6) };
    }
    case "month": {
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const mm = String(m).padStart(2, "0");
      return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
    }
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "all":
      // the API takes at most 20 years: "all time" is the last 20 years up to today
      return { from: `${y - 20}-${String(m).padStart(2, "0")}-${today.slice(8)}`, to: today };
  }
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const dateText = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the address into a view. A bad custom range keeps the default month and carries the message to show. */
export function resolveView(sp: Record<string, string | string[] | undefined>, zone: string, now = new Date()): View {
  const today = todayIn(zone, now);
  const asked = one(sp.period) as Period;
  const period = PERIODS.includes(asked) ? asked : "month";
  const base = { account: one(sp.account), band: one(sp.band) };
  if (period === "custom") {
    const from = one(sp.from);
    const to = one(sp.to);
    if (dateText.test(from) && dateText.test(to)) {
      if (to < from) return { period, ...presetRange("month", today), ...base, error: `The end is before the start. Choose an end on or after ${dayLabel(from)}.`, from, to };
      return { period, from, to, ...base, error: null };
    }
    return { period: "month", ...presetRange("month", today), ...base, error: "Choose a start and an end date." };
  }
  return { period, ...presetRange(period, today), ...base, error: null };
}

/** The query of GET /analytics (and /needs-you) for a view. */
export function apiQuery(v: View): string {
  const q = new URLSearchParams({ from: v.from, to: v.to });
  if (v.account) q.set("accountId", v.account);
  if (v.band) q.set("band", v.band);
  return q.toString();
}

/** An address of this app that keeps the view and changes a part of it. */
export function viewHref(path: string, v: View, over: Partial<Pick<View, "period" | "from" | "to" | "account" | "band">> = {}): string {
  const n = { ...v, ...over };
  const q = new URLSearchParams();
  if (n.period !== "month") q.set("period", n.period);
  if (n.period === "custom") {
    q.set("from", n.from);
    q.set("to", n.to);
  }
  if (n.account) q.set("account", n.account);
  if (n.band) q.set("band", n.band);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export const PERIOD_NAMES: Record<Period, string> = {
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  year: "This year",
  all: "All time",
  custom: "Custom range",
};

/** "This month (1 Oct to 31 Oct)" for the Period control. */
export function periodLabel(period: Period, from: string, to: string): string {
  const name = PERIOD_NAMES[period];
  if (period === "all") return `${name} (up to 20 years)`;
  if (period === "year") return `${name} (${from.slice(0, 4)})`;
  if (period === "month") return `${name} (${weekRange(from, to).replace(/^(\S+ \S+) to (\S+ \S+)$/, "$1 to $2")})`;
  return `${name} (${weekRange(from, to)})`;
}

export const monthTitle = (from: string) => monthName(from.slice(0, 7));

/** The Trades list for a set of trades: the scope plus one filter (a breakdown row, a mistake). */
export function tradesHref(v: View, filter: Record<string, string>): string {
  const q = new URLSearchParams({ from: v.from, to: v.to });
  if (v.account) q.set("account", v.account);
  for (const [k, val] of Object.entries(filter)) q.set(k, val);
  return `/trades?${q.toString()}`;
}
