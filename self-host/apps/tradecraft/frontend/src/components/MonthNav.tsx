"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { monthName, monthOfDay } from "@/lib/format";

/** One month at a time: arrows, a month list, Today, and a jump to a date (which opens that day's week). */
export function MonthNav({ account, month, previousMonth, nextMonth, months }: { account: string; month: string; previousMonth: string; nextMonth: string; months: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const href = (m?: string, extra = "") => `/reviews?account=${account}${m ? `&month=${m}` : ""}${extra}`;
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="bar-group">
      <div className="month-nav" ref={box}>
        <Link className="btn" href={href(previousMonth)} aria-label={`Earlier: ${monthName(previousMonth)}`}>&lt;</Link>
        <button type="button" className="btn month-name" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
          {monthName(month)} v
        </button>
        <Link className="btn" href={href(nextMonth)} aria-label={`Later: ${monthName(nextMonth)}`}>&gt;</Link>
        {open && (
          <div className="menu" role="listbox" aria-label="Months">
            {months.map((m) => (
              <Link key={m} href={href(m)} role="option" aria-selected={m === month} aria-current={m === month ? "true" : undefined} onClick={() => setOpen(false)}>
                {monthName(m)}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Link className="btn" href={href()}>Today</Link>
      <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <label className="label" htmlFor="jump">Jump to date</label>
        <input id="jump" type="date" className="field-input" style={{ width: 160 }} onChange={(e) => e.target.value && router.push(href(monthOfDay(e.target.value), `&open=${e.target.value}`))} />
      </div>
    </div>
  );
}
