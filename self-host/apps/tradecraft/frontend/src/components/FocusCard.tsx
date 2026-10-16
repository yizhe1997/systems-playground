import type { DailyReview } from "@/lib/types";
import { FocusButton } from "@/components/FocusDialog";
import { dayLabel, monthName, weekRange } from "@/lib/format";

/** The three focus lines at the top of a daily review: yesterday's answer, the week's focus, the month's focus. */
export function FocusCard({ review }: { review: DailyReview }) {
  const { yesterday, week, month } = review.focus;
  return (
    <section className="card focus-card" aria-label="Focus">
      <div className="focus-line">
        <div>
          {yesterday ? (
            <>
              <div className="label">Yesterday: {dayLabel(yesterday.date, false)}</div>
              <div className="focus-text">{yesterday.body}</div>
            </>
          ) : (
            <>
              <div className="label">Yesterday: nothing to show</div>
              <div className="focus-text helper">No earlier focus yet. What you write in the last box below will appear here tomorrow.</div>
            </>
          )}
        </div>
      </div>
      <div className="focus-line">
        <div>
          <div className="label">This week ({weekRange(week.periodStart, week.periodEnd)})</div>
          {week.body ? <div className="focus-text">{week.body}</div> : <div className="focus-text helper">No focus for this week yet.</div>}
        </div>
        <FocusButton date={review.date} period="week" written={week.body !== null} />
      </div>
      <div className="focus-line">
        <div>
          <div className="label">This month ({monthName(month.periodStart.slice(0, 7), false)})</div>
          {month.body ? <div className="focus-text">{month.body}</div> : <div className="focus-text helper">No focus for this month yet.</div>}
        </div>
        <FocusButton date={review.date} period="month" written={month.body !== null} />
      </div>
    </section>
  );
}
