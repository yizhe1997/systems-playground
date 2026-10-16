"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { call } from "@/lib/browserApi";
import { dayLabel, monthName, monthOfDay } from "@/lib/format";
import type { Calendar } from "@/lib/types";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Previous day, a picker for any day (marking days with trades and missing reviews), next day. */
export function DayNav({ account, date, previousDate, nextDate, today }: { account: string; date: string; previousDate: string; nextDate: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOfDay(date));
  const [cal, setCal] = useState<Calendar | null>(null);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const href = (d: string) => `/reviews/day?account=${account}&date=${d}`;

  // a new day was chosen: the picker has done its job
  useEffect(() => setOpen(false), [date]);

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

  // the grid of the month, Monday first (a calendar layout only; the marks come from the API)
  const first = new Date(month + "-01T00:00:00Z");
  const lead = (first.getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const shift = (n: number) => {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const mark = (d: string) => cal?.days.find((x) => x.date === d);

  return (
    <div className="day-nav" ref={box}>
      <Link className="btn" href={href(previousDate)}>&lt; {dayLabel(previousDate, false)}</Link>
      <button type="button" className="btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setMonth(monthOfDay(date)); setOpen(!open); }}>
        {dayLabel(date, false)} v
      </button>
      <Link className="btn" href={href(nextDate)}>{dayLabel(nextDate, false)} &gt;</Link>
      {open && (
        <div className="calendar" role="dialog" aria-label="Pick a day">
          <div className="cal-head">
            <button type="button" className="btn-quiet" onClick={() => shift(-1)} aria-label="Earlier month">&lt;</button>
            <span>{monthName(month)}</span>
            <button type="button" className="btn-quiet" onClick={() => shift(1)} aria-label="Later month">&gt;</button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => <span key={d} className="dow">{d}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: dim }, (_, i) => {
              const day = `${month}-${String(i + 1).padStart(2, "0")}`;
              const m = mark(day);
              return (
                <Link key={day} className="cal-day" href={href(day)} aria-current={day === date ? "date" : undefined} aria-label={`${dayLabel(day)}${m?.hasTrades ? ", has trades" : ""}${m?.missing ? ", review missing" : ""}`}>
                  {i + 1}
                  <small aria-hidden="true">{m?.missing ? "!" : m?.hasTrades ? "•" : ""}</small>
                </Link>
              );
            })}
          </div>
          {failed && <p className="helper" role="alert">! Could not reach the journal.</p>}
          <p className="helper" style={{ marginTop: 8 }}>• has trades · ! review missing</p>
          <div className="form-actions" style={{ marginTop: 8 }}>
            <Link className="btn-quiet" href={href(today)}>Go to today</Link>
          </div>
        </div>
      )}
    </div>
  );
}
