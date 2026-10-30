// Display-only formatting. Stored and sent values are exact decimal strings; they are rounded here and only here,
// to the number of decimals the currency normally uses. Intl formats a decimal string without going through a float.

type Decimalish = number; // Intl.NumberFormat accepts exact decimal strings; its typings only say number
const asNum = (s: string) => s as unknown as Decimalish;

// Building an Intl formatter is the slow part; a list of thousands of rows reuses a handful of them.
const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = "n" + JSON.stringify(options);
  let f = formatters.get(key) as Intl.NumberFormat | undefined;
  if (!f) formatters.set(key, (f = new Intl.NumberFormat("en-US", options)));
  return f;
}
function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = "d" + locale + JSON.stringify(options);
  let f = formatters.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(locale, options)));
  return f;
}

/** -$125.00, +$100.00 (signed), or a plain number with two decimals when there is no currency yet. */
export function money(value: string, currency: string | null, signed = false): string {
  return numberFormat({
    style: currency ? "currency" : "decimal",
    currency: currency ?? undefined,
    minimumFractionDigits: currency ? undefined : 2,
    maximumFractionDigits: currency ? undefined : 2,
    signDisplay: signed ? "always" : "auto",
  }).format(asNum(value));
}

/** +0.24 R, -0.50 R: two decimals, display only. */
export function rValue(value: string): string {
  return (
    numberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" }).format(asNum(value)) +
    " R"
  );
}

/** A ratio or an average to two decimals (1.77), display only; signed adds the sign. */
export function ratio(value: string, signed = false): string {
  return numberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: signed ? "always" : "auto" }).format(asNum(value));
}

/** Size shown as stored, without trailing zeros. */
export function plain(value: string): string {
  return numberFormat({ maximumFractionDigits: 8, useGrouping: false }).format(asNum(value));
}

export function profitClass(value: string | null): string {
  if (value === null) return "";
  if (value.startsWith("-")) return "loss";
  return /[1-9]/.test(value) ? "profit" : "";
}

function parts(date: Date, zone: string, opts: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const p of dateFormat("en-US", { timeZone: zone, hourCycle: "h23", ...opts }).formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** Wed 1 Oct 2025 for a plain date (a trading day). */
export function dayLabel(day: string, withYear = true): string {
  const p = parts(new Date(day + "T00:00:00Z"), "UTC", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return `${p.weekday} ${p.day} ${p.month}${withYear ? " " + p.year : ""}`;
}

/** Wed 1 Oct 10:52 for an instant, read in the journal zone, on a 24-hour clock. */
export function dateTime(iso: string, zone: string, withYear = false): string {
  const p = parts(new Date(iso), zone, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return `${p.weekday} ${p.day} ${p.month}${withYear ? " " + p.year : ""} ${p.hour}:${p.minute}`;
}

/** Today's date (YYYY-MM-DD) in the journal zone. */
export function todayIn(zone: string, now = new Date()): string {
  const p = parts(now, zone, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** First and last day of the month that contains today in the journal zone. */
export function currentMonth(zone: string, now = new Date()): { from: string; to: string } {
  const [y, m] = todayIn(zone, now).split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

/** "Central Time" for America/Chicago. */
export function zoneName(zone: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longGeneric" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName");
  return part?.value ?? zone;
}

/** Wed 1 Oct 2025 10:42 for "Current time in this zone". */
export function nowIn(zone: string, now = new Date()): string {
  return dateTime(now.toISOString(), zone, true);
}

/** The local date and time of an API instant string ("2025-10-07T09:58:00-05:00"): its first sixteen characters. */
export function splitLocal(iso: string): { date: string; time: string } {
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** The Trades address that shows the whole month of a trading day, so a saved trade is always on screen after Save. */
export function monthQuery(day: string): string {
  const [y, m] = day.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return `/trades?from=${y}-${mm}-01&to=${y}-${mm}-${String(last).padStart(2, "0")}`;
}

/** "Wed 1 Oct 2025 09:41" for a local date and time kept as "2025-10-01T09:41..." (API) or typed as "2025-10-01 09:41". */
export function screenTime(local: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(local.trim());
  return m ? `${dayLabel(m[1])} ${m[2]}` : local;
}

// ---------- feature 001: display styles for reviews ----------

/** Wednesday 1 October 2025 */
export function longDay(day: string): string {
  const p = parts(new Date(day + "T00:00:00Z"), "UTC", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** 29 Sep to 5 Oct, for a week given by its first and last day. */
export function weekRange(start: string, end: string): string {
  const f = (d: string) => {
    const p = parts(new Date(d + "T00:00:00Z"), "UTC", { day: "numeric", month: "short" });
    return `${p.day} ${p.month}`;
  };
  return `${f(start)} to ${f(end)}`;
}

/** October 2025, for "2025-10". */
export function monthName(month: string, withYear = true): string {
  const p = parts(new Date(month + "-01T00:00:00Z"), "UTC", { month: "long", year: "numeric" });
  return withYear ? `${p.month} ${p.year}` : (p.month ?? "");
}

/** 10:14 for an instant in the journal zone. */
export function clock(iso: string, zone: string): string {
  const p = parts(new Date(iso), zone, { hour: "2-digit", minute: "2-digit" });
  return `${p.hour}:${p.minute}`;
}

/** "1 trade" or "3 trades". */
export function count(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The account's Penpot-style summary of the plan line: "Plan followed 2 of 3". */
export function planLine(p: { followed: number; of: number }): string {
  return `Plan followed ${p.followed} of ${p.of}`;
}

/** The detail under it: "1 not followed · 0 partly", plus "· 1 not judged yet" when there are unjudged trades. */
export function planDetail(p: { notFollowed: number; partly: number; notJudged: number }): string {
  const base = `${p.notFollowed} not followed · ${p.partly} partly`;
  return p.notJudged > 0 ? `${base} · ${p.notJudged} not judged yet` : base;
}

/** The year-month of a date: "2025-10". */
export const monthOfDay = (day: string) => day.slice(0, 7);

/** The ISO week text of a Monday (the value of an <input type="week">): 2026-W41. Weeks start on Monday, like the journal's. */
export function isoWeekOf(monday: string): string {
  const thu = new Date(Date.parse(monday + "T00:00:00Z") + 3 * 86_400_000);
  const jan1 = Date.UTC(thu.getUTCFullYear(), 0, 1);
  const week = Math.floor((thu.getTime() - jan1) / (7 * 86_400_000)) + 1;
  return `${thu.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The Monday (YYYY-MM-DD) of an ISO week text such as 2026-W41. */
export function mondayOfIsoWeek(text: string): string {
  const [y, w] = text.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const week1Monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000;
  return new Date(week1Monday + (w - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
}
