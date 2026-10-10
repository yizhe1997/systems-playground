import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiFailure } from "@/lib/api";
import { getAccounts, getReviewsMonth, getSettings, getWeekly } from "@/lib/data";
import { one, resolveAccount } from "@/lib/reviewsContext";
import { count, dayLabel, longDay, money, monthName, planLine, profitClass, weekRange } from "@/lib/format";
import type { WeeklyDay } from "@/lib/types";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { CouldNotLoad } from "@/components/Notice";
import { FocusButton } from "@/components/FocusDialog";
import { MarkWeek } from "@/components/MarkWeek";
import { NoAccount } from "@/components/NoAccount";
import { NumbersStrip } from "@/components/NumbersStrip";
import { StatusChip } from "@/components/StatusChip";
import { WeekNav } from "@/components/WeekNav";

export const dynamic = "force-dynamic";

function Day({ d, account, currency }: { d: WeeklyDay; account: string; currency: string }) {
  const label = dayLabel(d.date, false);
  const open = `/reviews/day?account=${account}&date=${d.date}`;
  if (d.status === "no_trades" || d.status === "not_yet") {
    return (
      <div className="wk-day wk-day-empty">
        <span className="day-date">{label}</span>
        <StatusChip state={d.status} />
        <span className="helper">{d.status === "not_yet" ? "This day has not happened yet." : `No trades on ${label}.`}</span>
      </div>
    );
  }
  const needsReview = d.status === "missing" || d.status === "today";
  const net = d.netResult !== null ? money(d.netResult, currency, true) : "—";
  return (
    <div className="wk-day">
      <div className="wk-day-head">
        <span className="day-date">{label}</span>
        <StatusChip state={d.status} />
        <span className={`day-net ${profitClass(d.netResult)}`}>{net}</span>
        <span className="helper">{d.trades > 0 ? `${count(d.trades, "trade")} · ${planLine(d.planFollowed)}` : "no trades"}</span>
        <span className="spacer" />
        <Link className="btn" href={open} aria-label={`${needsReview ? "Review" : "Open"} ${longDay(d.date)}`}>{needsReview ? "Review this day" : "Open"}</Link>
      </div>
      {d.status === "missing" ? (
        <p className="helper">No review for {label}. Its {count(d.trades, "trade")} ({net}, plan followed {d.planFollowed.followed} of {d.planFollowed.of}) {d.trades === 1 ? "is" : "are"} included in the totals below.</p>
      ) : (
        d.answers && (
          <dl className="wk-answers">
            <div><dt>Did well</dt><dd>{d.answers.didWell || "—"}</dd></div>
            <div><dt>Could improve</dt><dd>{d.answers.couldImprove || "—"}</dd></div>
            <div><dt>Next focus</dt><dd>{d.answers.nextFocus || "—"}</dd></div>
            <div><dt>Grades</dt><dd>Mental {d.mentalGrade ?? "—"} of 5 · Technical {d.technicalGrade ?? "—"} of 5</dd></div>
          </dl>
        )
      )}
    </div>
  );
}

export default async function WeeklyReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let accounts, settings;
  try {
    [accounts, settings] = await Promise.all([getAccounts(true), getSettings()]);
  } catch (err) {
    unstable_rethrow(err);
    return <CouldNotLoad />;
  }
  const account = resolveAccount(accounts, one(sp.account));
  if (!account) return <NoAccount title="Weekly review" />;

  let date = one(sp.date);
  let week;
  try {
    if (!date) date = (await getReviewsMonth(account.id)).today;
    week = await getWeekly(account.id, date);
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiFailure && (e.status === 404 || e.status === 422)) notFound();
    return <CouldNotLoad />;
  }
  const range = weekRange(week.weekStart, week.weekEnd);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Weekly review</h1>
          <p className="subtitle">Week of {range} {week.weekEnd.slice(0, 4)} · {week.accountName}</p>
        </div>
        <div className="bar-group">
          <AccountSwitcher accounts={accounts} current={account.id} />
          <StatusChip state={week.state} />
        </div>
      </div>
      <div className="bar">
        <WeekNav account={account.id} weekStart={week.weekStart} weekEnd={week.weekEnd} previousWeek={week.previousWeek} nextWeek={week.nextWeek} today={week.today} />
      </div>

      <section className="card focus-card" aria-label="Focus">
        <div className="focus-line">
          <div>
            <div className="label">This week ({range})</div>
            {week.focus.week.body ? <div className="focus-text">{week.focus.week.body}</div> : <div className="focus-text helper">No focus for this week yet.</div>}
          </div>
          <FocusButton date={week.weekEnd} period="week" written={week.focus.week.body !== null} />
        </div>
        <div className="focus-line">
          <div>
            <div className="label">This month ({monthName(week.focus.month.periodStart.slice(0, 7), false)})</div>
            {week.focus.month.body ? <div className="focus-text">{week.focus.month.body}</div> : <div className="focus-text helper">No focus for this month yet.</div>}
          </div>
          <FocusButton date={week.weekEnd} period="month" written={week.focus.month.body !== null} />
        </div>
      </section>

      <section className="card section-card" aria-labelledby="days-title">
        <div className="section-head">
          <h2 className="section" id="days-title">The days</h2>
          <span className="helper">What you wrote each day. Days without a review are named, and their trades still count below.</span>
        </div>
        {week.days.map((d) => <Day key={d.date} d={d} account={account.id} currency={week.currency} />)}
      </section>

      <h2 className="section" style={{ margin: "var(--space-md) 0 var(--space-sm)" }}>The week in numbers</h2>
      <NumbersStrip stats={week.stats} />

      <MarkWeek week={week} zone={settings.timeZone} />
    </>
  );
}
