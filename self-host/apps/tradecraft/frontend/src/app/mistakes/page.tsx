import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { getAccounts, getCounter, getMistakes } from "@/lib/data";
import { one } from "@/lib/reviewsContext";
import { isoWeekOf, monthName, weekRange } from "@/lib/format";
import type { CounterCell, CounterRow, Mistake } from "@/lib/types";
import { CounterControls } from "@/components/CounterControls";
import { CouldNotLoad } from "@/components/Notice";
import { AddMistake, MistakeActions } from "@/components/MistakeDialogs";

export const dynamic = "force-dynamic";

function Cell({ cell }: { cell: CounterCell }) {
  return (
    <>
      <strong>{cell.total}</strong>
      <span className="reason">{cell.onTrades} on trades · {cell.onDays} on the day</span>
    </>
  );
}

function Status({ row }: { row: CounterRow }) {
  if (row.status === "stop") return <span className="chip chip-solid">STOP TRADING: {row.progress}</span>;
  return <span className="chip">{row.progress ?? "Count only"}</span>;
}

export default async function MistakesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const period = one(sp.period) === "month" ? "month" : "week";
  const date = one(sp.date);
  const accountParam = one(sp.account);
  let accounts, mistakes, counter;
  try {
    [accounts, mistakes] = await Promise.all([getAccounts(true), getMistakes(false)]);
    counter = await getCounter(period, date || undefined, accountParam || undefined);
  } catch (err) {
    unstable_rethrow(err);
    return <CouldNotLoad />;
  }
  const account = accounts.find((a) => a.id === accountParam)?.id ?? "";
  const byId = new Map<string, Mistake>(mistakes.map((m) => [m.id, m]));
  const names = new Map(accounts.map((a) => [a.id, a.name]));

  const current = !date; // no date asked: the week and month that hold today
  const rangeText = period === "week" ? weekRange(counter.periodStart, counter.periodEnd) : monthName(counter.periodStart.slice(0, 7));
  const href = (d?: string, p = period) => {
    const q = new URLSearchParams({ period: p });
    if (d) q.set("date", d);
    if (account) q.set("account", account);
    return `/mistakes?${q.toString()}`;
  };
  const viewed = (r: CounterRow) => (period === "week" ? r.week.total : r.month.total);
  const rows = counter.rows.filter((r) => viewed(r) > 0 || r.stopLine !== null);
  const nothingTagged = counter.rows.every((r) => viewed(r) === 0);
  // all accounts means all live accounts; said at the foot of the counter itself (feature 003, screen B5)
  const liveOnly = !account && accounts.some((a) => a.kind === "backtest")
    ? <p className="helper" style={{ marginTop: 12 }}>Counting live accounts only. Choose a backtest account to count its mistakes on their own.</p>
    : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Mistakes</h1>
          <p className="subtitle">How often each mistake showed up, and the line you set for each. {account ? `${names.get(account)}.` : "Across all live accounts."} {period === "week" ? `Week of ${rangeText} ${counter.periodEnd.slice(0, 4)}.` : `${rangeText}.`}</p>
        </div>
      </div>

      <div className="bar">
        <div className="pills" role="group" aria-label="Period">
          <Link className="pill" href={href(date || undefined, "week")} aria-current={period === "week" ? "true" : undefined}>Week</Link>
          <Link className="pill" href={href(date || undefined, "month")} aria-current={period === "month" ? "true" : undefined}>Month</Link>
        </div>
        <CounterControls accounts={accounts} account={account} period={period} value={period === "week" ? isoWeekOf(counter.periodStart) : counter.periodStart.slice(0, 7)} />
      </div>

      {nothingTagged ? (
        <div className="card empty section-card">
          <h2 className="section">{current ? `No mistakes tagged this ${period} yet.` : `No mistakes tagged in this ${period}.`}</h2>
          <p>Tag them while you judge a trade in your daily review. They will be counted here, and you can set a stop line for any of them.</p>
          <Link className="btn" href="/reviews">Go to the daily review</Link>
          {liveOnly}
        </div>
      ) : (
        <section className="card section-card" aria-label="Mistake counter">
          <div className="table-wrap">
            <table className="trade-grid">
              <thead>
                <tr>
                  <th scope="col">Mistake</th>
                  <th scope="col">{current ? "This week" : "Week"}</th>
                  <th scope="col">{current ? "This month" : "Month"}</th>
                  <th scope="col">Stop line</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const m = byId.get(r.mistakeId);
                  return (
                    <tr key={r.mistakeId}>
                      <td>
                        <strong>{r.name}</strong> {r.retired && <span className="chip chip-dashed">Retired</span>}
                        <span className="reason">{r.accounts.length > 0 ? r.accounts.map((a) => `${a.name} ${a.count}`).join(" · ") : "—"}</span>
                      </td>
                      <td><Cell cell={r.week} /></td>
                      <td><Cell cell={r.month} /></td>
                      <td>
                        {r.stopLine !== null ? `${r.stopLine} per ${r.stopPeriod}` : <span className="helper">none set</span>}
                        {m && <MistakeActions mistake={m} actions={["stop"]} />}
                      </td>
                      <td><Status row={r} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="helper" style={{ marginTop: 12 }}>Each record counts once, whether it was tagged on a trade or recorded for the whole day.</p>
          {liveOnly}
        </section>
      )}

      <section className="card section-card" aria-labelledby="manage-title">
        <h2 className="section" id="manage-title">Manage the list</h2>
        <p className="helper">Retiring a mistake hides it from new tags; past trades keep it, so history and counts stay correct.</p>
        <ul className="manage-list">
          {mistakes.map((m) => (
            <li key={m.id}>
              <span className="manage-name">{m.name}</span>
              <span className="helper">{m.stopLine !== null ? `Stop line ${m.stopLine} per ${m.stopPeriod}` : "No stop line"}</span>
              <span className="spacer" />
              <MistakeActions mistake={m} actions={["stop", "rename", "retire"]} />
            </li>
          ))}
        </ul>
        <AddMistake />
      </section>
    </>
  );
}
