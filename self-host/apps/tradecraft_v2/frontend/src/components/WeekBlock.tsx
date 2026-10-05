import Link from "next/link";
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
        <StatusChip state={day.state} />
      </div>
      <div className="day-actions">
        <Link className="btn" href={href} aria-label={`${missing ? "Review" : "Open"} ${longDay(day.date)}`}>{missing ? "Review this day" : "Open"}</Link>
      </div>
    </div>
  );
}

/** One week of the month, collapsible, with its days as rows. The current week (and one jumped to) starts open. */
export function WeekBlock({ week, account, open }: { week: WeekT; account: string; open: boolean }) {
  const s = week.summary;
  const summary = s.daysWithTrades === 0 && s.draft === 0 ? "No days to review yet" : [`${s.reviewed} of ${s.daysWithTrades} ${s.daysWithTrades === 1 ? "day" : "days"} reviewed`, `${s.draft} draft`, `${s.missing} missing`].join(" · ");
  return (
    <div className="card week-card">
    <details className="week" open={open}>
      <summary>
        <span className="week-title">
          Week of {weekRange(week.weekStart, week.weekEnd)}
          {week.current && <span className="chip">This week</span>}
        </span>
        <span className="week-chip"><StatusChip state={week.state} /></span>
        <span className="helper week-sum">{summary}</span>
      </summary>
      <div className="days">
        {week.days.length === 0 && <p className="helper" style={{ padding: "14px var(--card-pad)" }}>No days to review in this week yet.</p>}
        {week.days.map((d) => <DayRow key={d.date} day={d} account={account} />)}
      </div>
    </details>
    {/* outside the summary: a link inside it would be a control nested in a control */}
    <Link className="btn week-open" href={`/reviews/week?account=${account}&date=${week.weekStart}`}>Open weekly review</Link>
    </div>
  );
}
