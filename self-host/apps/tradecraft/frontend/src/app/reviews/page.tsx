import Link from "next/link";
import { getAccounts, getCalendar, getReviewsMonth } from "@/lib/data";
import { one, resolveAccount } from "@/lib/reviewsContext";
import { monthName } from "@/lib/format";
import type { WeekBlock as WeekT } from "@/lib/types";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { CouldNotLoad } from "@/components/Notice";
import { FocusButton } from "@/components/FocusDialog";
import { MonthNav } from "@/components/MonthNav";
import { NoAccount } from "@/components/NoAccount";
import { WeekBlock } from "@/components/WeekBlock";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "missing", "draft", "reviewed"] as const;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let accounts;
  try {
    accounts = await getAccounts(true);
  } catch {
    return <CouldNotLoad />;
  }
  const account = resolveAccount(accounts, one(sp.account));
  if (!account) return <NoAccount title="Reviews" />;

  let data, cal;
  try {
    data = await getReviewsMonth(account.id, one(sp.month) || undefined);
    cal = await getCalendar(account.id, data.month);
  } catch {
    return <CouldNotLoad />;
  }
  const filter = (FILTERS as readonly string[]).includes(one(sp.filter)) ? one(sp.filter) : "all";
  const jumpTo = one(sp.open);
  const base = `/reviews?account=${account.id}&month=${data.month}`;

  const visible: WeekT[] = data.weeks
    .map((w) => (filter === "all" ? w : { ...w, days: w.days.filter((d) => d.state === filter) }))
    .filter((w) => filter === "all" || w.days.length > 0);
  const nothingYet = data.weeks.every((w) => w.days.length === 0);
  const neverAnything = cal.months.length <= 1 && nothingYet;

  const f = data.filters;
  const pills: [string, string][] = [
    ["all", "All"],
    ["missing", `Missing ${f.missing}`],
    ["draft", `Draft ${f.draft}`],
    ["reviewed", `Reviewed ${f.reviewed}`],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Reviews</h1>
          <p className="subtitle">Every day and week, with what is still missing.</p>
        </div>
        <AccountSwitcher accounts={accounts} current={account.id} />
      </div>

      <div className="bar">
        <div className="pills" role="group" aria-label="Show">
          {pills.map(([key, label]) => (
            <Link key={key} className="pill" href={`${base}${key === "all" ? "" : `&filter=${key}`}`} aria-current={filter === key ? "true" : undefined}>
              {label}
            </Link>
          ))}
        </div>
        <MonthNav account={account.id} month={data.month} previousMonth={data.previousMonth} nextMonth={data.nextMonth} months={cal.months} />
      </div>

      <section className="card focus-card" aria-label={`Focus for ${monthName(data.month, false)}`}>
        <div className="focus-line">
          <div>
            <div className="label">This month ({monthName(data.month, false)})</div>
            {data.monthFocus.body ? <div className="focus-text">{data.monthFocus.body}</div> : <div className="focus-text helper">No focus for this month yet.</div>}
            <p className="helper">Shown on every daily and weekly review this month.</p>
          </div>
          <FocusButton date={data.monthFocus.periodStart} period="month" written={data.monthFocus.body !== null} only="month" />
        </div>
      </section>

      {neverAnything ? (
        <div className="card empty">
          <h2 className="section">Nothing to review yet for {account.name}.</h2>
          <p>Log your first trade and its day appears here, ready to review.</p>
          <Link className="btn" href="/trades/new">Add a trade</Link>
        </div>
      ) : (
        <div className="weeks">
          {visible.map((w) => (
            <WeekBlock key={w.weekStart} week={w} account={account.id} open={filter !== "all" || w.current || (jumpTo !== "" && jumpTo >= w.weekStart && jumpTo <= w.weekEnd)} />
          ))}
        </div>
      )}
      <p className="helper" style={{ marginTop: 16 }}>
        Opens on the current month with the current week open. A week is listed under the month it ends in. Days with no trades are listed only after you open them. The money figure always has the plan figure beside it.
      </p>
    </>
  );
}
