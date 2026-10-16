"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { call } from "@/lib/browserApi";
import { dayLabel, monthName, weekRange } from "@/lib/format";
import type { Calendar } from "@/lib/types";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const shiftDay = (day: string, n: number) => new Date(Date.parse(day + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

/** Previous week, a picker for any week (each row a week, marked Reviewed or Missing), next week. */
export function WeekNav({ account, weekStart, weekEnd, previousWeek, nextWeek, today }: { account: string; weekStart: string; weekEnd: string; previousWeek: string; nextWeek: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(weekEnd.slice(0, 7));
  const [cal, setCal] = useState<Calendar | null>(null);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const href = (d: string) => `/reviews/week?account=${account}&date=${d}`;

  // a new week was chosen: the picker has done its job
  useEffect(() => setOpen(false), [weekStart]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setFailed(false);
    call<Calendar>("GET", `/reviews/calendar?accountId=${account}&month=${month}`).then((r) => {
      if (!alive) return;
      if (r.ok) setCal(r.data);
      else setFailed(true);
    });
    return () => { alive = false; };
  }, [open, month, account]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const first = new Date(month + "-01T00:00:00Z");
  const shiftMonth = (n: number) => setMonth(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1)).toISOString().slice(0, 7));
  const label: Record<string, string> = { reviewed: "Reviewed", missing: "Missing" };

  return (
    <div className="day-nav" ref={box}>
      <Link className="btn" href={href(previousWeek)}>&lt; Previous week</Link>
      <button type="button" className="btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setMonth(weekEnd.slice(0, 7)); setOpen(!open); }}>
        Week of {weekRange(weekStart, weekEnd)} v
      </button>
      <Link className="btn" href={href(nextWeek)}>Next week &gt;</Link>
      {open && (
        <div className="calendar week-picker" role="dialog" aria-label="Pick a week">
          <div className="cal-head">
            <button type="button" className="btn-quiet" onClick={() => shiftMonth(-1)} aria-label="Earlier month">&lt;</button>
            <span>{monthName(month)}</span>
            <button type="button" className="btn-quiet" onClick={() => shiftMonth(1)} aria-label="Later month">&gt;</button>
          </div>
          <div className="week-rows">
            <div className="week-row week-row-head">
              {DOW.map((d) => <span key={d} className="dow">{d}</span>)}
              <span className="dow">Week</span>
            </div>
            {(cal?.weeks ?? []).map((w) => (
              <Link key={w.weekStart} className="week-row" href={href(w.weekStart)} aria-current={w.weekStart === weekStart ? "true" : undefined} aria-label={`Week of ${weekRange(w.weekStart, shiftDay(w.weekStart, 6))}${label[w.state] ? `, ${label[w.state]}` : ""}`}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = shiftDay(w.weekStart, i);
                  return <span key={d} className={d.slice(0, 7) === month ? "" : "cal-out"} title={dayLabel(d)}>{Number(d.slice(8))}</span>;
                })}
                <span className="week-mark">{label[w.state] ?? ""}</span>
              </Link>
            ))}
          </div>
          {failed && <p className="helper" role="alert">! Could not reach the journal.</p>}
          <p className="helper" style={{ marginTop: 8 }}>Click any day, or a row, to open that week. Weekends count.</p>
          <div className="form-actions" style={{ marginTop: 8 }}>
            <Link className="btn-quiet" href={href(today)}>This week</Link>
          </div>
        </div>
      )}
    </div>
  );
}
