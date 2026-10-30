import Link from "next/link";
import type { Counter, DailyReview } from "@/lib/types";
import { dayLabel, monthName, weekRange } from "@/lib/format";
import { FocusButton } from "@/components/FocusDialog";

/** "Your focus" (H1): yesterday's answer, the week's and the month's focus, read from the daily review of an account. */
export function FocusPanel({ review, today }: { review: DailyReview | null; today: string }) {
  if (!review) {
    return (
      <section className="card side-card" aria-label="Your focus">
        <h3 className="section">Your focus</h3>
        <p className="helper">No focus written. Choose an account to see its latest focus.</p>
      </section>
    );
  }
  const { yesterday, week, month } = review.focus;
  return (
    <section className="card side-card" aria-label="Your focus">
      <h3 className="section">Your focus</h3>
      <div>
        <div className="label">{yesterday ? `Yesterday (from the review of ${dayLabel(yesterday.date, false)})` : "Yesterday"}</div>
        <p>{yesterday ? yesterday.body : <span className="helper">No focus written.</span>}</p>
      </div>
      <div className="focus-row">
        <div>
          <div className="label">This week ({weekRange(week.periodStart, week.periodEnd)})</div>
          <p>{week.body ?? <span className="helper">No focus written.</span>}</p>
        </div>
        <FocusButton date={today} period="week" written={week.body !== null} />
      </div>
      <div className="focus-row">
        <div>
          <div className="label">This month ({monthName(month.periodStart.slice(0, 7), false)})</div>
          <p>{month.body ?? <span className="helper">No focus written.</span>}</p>
        </div>
        <FocusButton date={today} period="month" written={month.body !== null} />
      </div>
    </section>
  );
}

/** "Mistakes in October" (H1): each mistake's records this month, and its stop line when it has one. */
export function MistakePanel({ counter, today }: { counter: Counter; today: string }) {
  const rows = counter.rows.filter((r) => r.month.total > 0 || r.status === "stop");
  const records = counter.rows.reduce((n, r) => n + r.month.total, 0);
  return (
    <section className="card side-card" aria-label="Mistakes">
      <div className="side-head">
        <h3 className="section">Mistakes in {monthName(today.slice(0, 7), false)}</h3>
        <span className="helper">{records} {records === 1 ? "record" : "records"}</span>
      </div>
      {rows.length === 0 ? (
        <p className="helper">No mistakes recorded this month.</p>
      ) : (
        <ul className="side-list">
          {rows.map((r) => (
            <li key={r.mistakeId}>
              <span>{r.name}</span>
              <span>
                <strong>{r.progress ?? `${r.month.total} this month`}</strong>
                {r.stopLine !== null && r.progress && <span className="helper"> stop line: {r.stopLine} per {r.stopPeriod}</span>}
                {r.status === "stop" && <span className="tag">STOP TRADING</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="helper">A count is the number of records: each tag on a trade and each whole-day record.</p>
      <Link href="/mistakes">Open the Mistakes counter</Link>
    </section>
  );
}
