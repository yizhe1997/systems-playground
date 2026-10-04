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
