import Link from "next/link";
import type { Block, CalendarDay, Plan } from "@/lib/analytics";
import { monthName, money } from "@/lib/format";

// The calendar of Home (H1): one cell per trading day of the period, in text (the day's result and its plan figure), so
// no meaning is carried by colour. A cell is a link to the daily review of the account with the most trades that day.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_MONTHS = 12;

function planCell(p: Plan): string {
  if (p.notJudged === p.of) return "Not judged";
  return `Plan ${p.followed} of ${p.of}${p.partly > 0 ? " (partly)" : ""}${p.notJudged > 0 ? ` · ${p.notJudged} not judged` : ""}`;
}

type Entry = { block: Block; d: CalendarDay };

function months(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ey, em] = to.slice(0, 7).split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) [y, m] = [y + 1, 1];
  }
  return out;
}

export function CalendarHeatmap({ blocks, from, to }: { blocks: Block[]; from: string; to: string }) {
  const byDay = new Map<string, Entry[]>();
  for (const b of blocks) for (const d of b.days) byDay.set(d.day, [...(byDay.get(d.day) ?? []), { block: b, d }]);
  const all = months(from, to);
  const shown = all.slice(-MAX_MONTHS);
  return (
    <section className="home-calendar" aria-label="Calendar">
      <div className="chart-head">
        <h3 className="section">Calendar</h3>
        <span className="helper">one cell per trading day: result and plan followed</span>
      </div>
      {all.length > shown.length && (
        <p className="helper">Showing the {MAX_MONTHS} latest months of the period. Choose a shorter period to see the earlier ones.</p>
      )}
      {shown.map((month) => {
        const [y, m] = month.split("-").map(Number);
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        // Saturday and Sunday columns only for a month that has a trade on one of them
        const weekend = Array.from(byDay.keys()).some((k) => k.startsWith(month) && [0, 6].includes(new Date(k + "T00:00:00Z").getUTCDay()));
        const cols = weekend ? 7 : 5;
        const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
        const cells: (number | null)[] = [];
        for (let i = 0; i < lead; i++) cells.push(null);
        for (let d = 1; d <= last; d++) cells.push(d);
        const rows: (number | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
        return (
          <div key={month} className="cal-month">
            <h4 className="cal-title">{monthName(month)}</h4>
            <div className="cal-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label={monthName(month)}>
              {WEEKDAYS.slice(0, cols).map((w) => <div key={w} className="cal-head" aria-hidden="true">{w}</div>)}
              {rows.flatMap((r, ri) =>
                r.slice(0, cols).map((d, ci) => {
                  if (d === null) return <div key={`${ri}-${ci}`} className="cal-cell cal-out" />;
                  const iso = `${month}-${String(d).padStart(2, "0")}`;
                  const entries = byDay.get(iso);
                  const inside = iso >= from && iso <= to;
                  if (!entries) return <div key={iso} className={`cal-cell${inside ? " cal-empty" : " cal-out"}`}><span className="cal-day">{d}</span>{inside && <span className="helper">no trades</span>}</div>;
                  const main = entries.reduce((a, b) => (b.d.trades > a.d.trades ? b : a));
                  return (
                    <div key={iso} className="cal-cell cal-trades">
                      <Link href={`/reviews/day?account=${main.d.openAccountId}&date=${iso}`} className="cal-link" aria-label={`${iso}: ${entries.map((e) => `${money(e.d.result, e.block.currency, true)}, ${planCell(e.d.plan)}`).join("; ")}`}>
                        <span className="cal-day">{d}</span>
                        {entries.map((e) => (
                          <span key={e.block.currency} className="cal-result">
                            <strong>{money(e.d.result, e.block.currency, true)}</strong>
                            <span>{planCell(e.d.plan)}</span>
                          </span>
                        ))}
                      </Link>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        );
      })}
      <p className="helper">Select a day to open its daily review. Colour is not used: the border marks days with trades.</p>
    </section>
  );
}
