"use client";

import Link from "next/link";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronsUpDown } from "lucide-react";
import type { DayRow as DayRowT, WeekBlock as WeekT } from "@/lib/types";
import { count, longDay, money, planLine, profitClass, weekRange, dayLabel } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";

function DayRow({ day, account }: { day: DayRowT; account: string }) {
  const href = `/reviews/day?account=${account}&date=${day.date}`;
  const missing = day.state === "missing" || day.state === "today";
  return (
    <div className="day-row">
      <span />
      <div>
        <div className="day-date">{dayLabel(day.date, false)}</div>
        <div className="helper">{count(day.trades, "trade")}</div>
      </div>
      <div>
        {day.netResult !== null ? (
          <div className={`day-net ${profitClass(day.netResult)}`}>{money(day.netResult, day.currency, true)}</div>
        ) : (
          <div className="day-net">—</div>
        )}
        <div className="helper">
          {day.trades > 0 ? planLine(day.planFollowed) : "no trades"} · {day.mistakes === 0 ? "no mistakes" : count(day.mistakes, "mistake")}
        </div>
      </div>
      <div>
        {day.state ? <StatusChip state={day.state} /> : <span className="helper" aria-label="No review state">—</span>}
      </div>
      <div className="day-actions">
        <Link className="btn" href={href} aria-label={`${missing ? "Review" : "Open"} ${longDay(day.date)}`}>{missing ? "Review this day" : "Open"}</Link>
      </div>
    </div>
  );
}

/** One week of the month, collapsible, with its days as rows. The current week (and one jumped to) starts open. */
export function WeekBlock({ week, account, open, backtest = false }: { week: WeekT; account: string; open: boolean; backtest?: boolean }) {
  const s = week.summary;
  const parts = [`${s.reviewed} of ${s.daysWithTrades} ${s.daysWithTrades === 1 ? "day" : "days"} reviewed`, `${s.draft} draft`];
  if (!backtest) parts.push(`${s.missing} missing`); // a backtest day is never missing
  const summary = s.daysWithTrades === 0 && s.draft === 0 ? "No days to review yet" : parts.join(" · ");
  const range = weekRange(week.weekStart, week.weekEnd);
  // the basic collapsible of shadcn/ui (Base UI's Collapsible): a header with a button that shows or hides the panel
  return (
    <Collapsible.Root className="card week-card week" defaultOpen={open}>
      <div className="week-head">
        <div className="week-main">
          <span className="week-title">
            Week of {range}
            {week.current && <span className="chip">This week</span>}
          </span>
          <span className="helper week-sum">{summary}</span>
        </div>
        <StatusChip state={week.state} />
        <Link className="btn" href={`/reviews/week?account=${account}&date=${week.weekStart}`}>Open weekly review</Link>
        <Collapsible.Trigger className="week-trigger" aria-label={`Show or hide the days of the week of ${range}`}>
          <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </Collapsible.Trigger>
      </div>
      <Collapsible.Panel className="days">
        {week.days.length === 0 && <p className="helper" style={{ padding: "14px var(--card-pad)" }}>No days to review in this week yet.</p>}
        {week.days.map((d) => <DayRow key={d.date} day={d} account={account} />)}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
