import Link from "next/link";
import type { NeedsYou as Needs, View } from "@/lib/analytics";
import { tradesHref } from "@/lib/analytics";
import { count, dateTime, dayLabel, weekRange } from "@/lib/format";

/** "Needs you" (H1): the days missing a review, the trades not judged yet and the weeks not marked reviewed. */
export function NeedsYou({ needs, view, zone }: { needs: Needs; view: View; zone: string }) {
  const { missingDays: days, notJudged: trades, missingWeeks: weeks } = needs;
  const nothing = days.total === 0 && trades.total === 0 && weeks.total === 0;
  const more = (total: number, shown: number, href: string) =>
    total > shown ? <p className="helper">and {total - shown} more · <Link href={href}>See them all</Link></p> : null;
  return (
    <section className="card side-card" aria-label="Needs you">
      <h3 className="section">Needs you</h3>
      {nothing && <p>Nothing is waiting for you.</p>}
      {days.total > 0 && (
        <div>
          <strong>{days.total} {days.total === 1 ? "day" : "days"} missing a review</strong>
          <ul className="need-list">
            {days.items.slice(0, 5).map((d) => (
              <li key={`${d.accountId}-${d.day}`}>
                <Link href={`/reviews/day?account=${d.accountId}&date=${d.day}`}>{dayLabel(d.day, false)}</Link> ({count(d.trades, "trade")}
                {view.account ? "" : `, ${d.accountName}`})
              </li>
            ))}
          </ul>
          {more(days.total, Math.min(days.items.length, 5), `/reviews${view.account ? `?account=${view.account}` : ""}`)}
          {days.total <= 5 && <span className="helper">Open the daily review</span>}
        </div>
      )}
      {trades.total > 0 && (
        <div>
          <strong>{trades.total} {trades.total === 1 ? "trade" : "trades"} not judged yet</strong>
          <ul className="need-list">
            {trades.items.slice(0, 5).map((t) => (
              <li key={t.tradeId}>
                <Link href={`/reviews/day?account=${t.accountId}&date=${t.tradingDay}`}>
                  {t.instrument} {t.direction === "long" ? "Long" : "Short"} {dateTime(t.entryAt, zone)}
                </Link>
              </li>
            ))}
          </ul>
          {more(trades.total, Math.min(trades.items.length, 5), tradesHref(view, { plan: "notjudged" }))}
          <span className="helper">Judge in the daily review</span>
        </div>
      )}
      {weeks.total > 0 && (
        <div>
          <strong>{weeks.total} {weeks.total === 1 ? "week" : "weeks"} not marked reviewed</strong>
          <ul className="need-list">
            {weeks.items.slice(0, 5).map((w) => (
              <li key={`${w.accountId}-${w.weekStart}`}>
                <Link href={`/reviews/week?account=${w.accountId}&date=${w.weekStart}`}>{weekRange(w.weekStart, w.weekEnd)}</Link>
                {view.account ? "" : ` (${w.accountName})`}
              </li>
            ))}
          </ul>
          {more(weeks.total, Math.min(weeks.items.length, 5), `/reviews${view.account ? `?account=${view.account}` : ""}`)}
          <span className="helper">Open the weekly review</span>
        </div>
      )}
    </section>
  );
}
