import Link from "next/link";
import type { Block, BreakdownRow, View } from "@/lib/analytics";
import { tradesHref } from "@/lib/analytics";
import { money, profitClass } from "@/lib/format";

type Kind = "weekday" | "hour" | "instrument" | "direction" | "account";

/** The Trades list for exactly the trades of a row: the scope of the view plus the row's filter. */
function href(view: View, kind: Kind, key: string): string {
  if (kind === "account") return tradesHref({ ...view, account: key }, {});
  const param = { weekday: "weekday", hour: "hour", instrument: "instrument", direction: "direction" }[kind];
  return tradesHref(view, { [param]: key });
}

function Table({ title, firstColumn, rows, kind, currency, view }: { title: string; firstColumn: string; rows: BreakdownRow[]; kind: Kind; currency: string; view: View }) {
  return (
    <section aria-label={`${title}, ${currency}`}>
      <h4 className="section">{title}</h4>
      <div className="card card-flush">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{firstColumn}</th>
              <th scope="col" className="num">Trades</th>
              <th scope="col" className="num">Net result</th>
              <th scope="col">Win rate</th>
              <th scope="col">Plan followed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.trades > 0 ? <Link href={href(view, kind, r.key)}>{r.label}</Link> : r.label}</th>
                <td className="num">{r.trades}</td>
                <td className={`num ${r.netResult ? profitClass(r.netResult) : "muted"}`}>{r.netResult !== null ? money(r.netResult, currency, true) : "— no trades"}</td>
                <td>{r.trades > 0 ? `${r.wins} of ${r.counted}${r.few ? " (few trades)" : ""}` : "—"}</td>
                <td>{r.trades > 0 ? `${r.plan.followed} of ${r.trades}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The five breakdowns of Analytics (H2). Select a row to open the Trades list for exactly those trades. */
export function Breakdowns({ block, view }: { block: Block; view: View }) {
  const b = block.breakdowns;
  const cur = block.currency;
  return (
    <section aria-label={`Breakdowns, ${cur}`}>
      <div className="chart-head">
        <h3 className="section">Breakdowns</h3>
        <span className="helper">Select a row to open the Trades list for exactly those trades.</span>
      </div>
      <div className="breakdown-grid">
        <Table title="By weekday" firstColumn="Weekday" rows={b.weekday} kind="weekday" currency={cur} view={view} />
        <div>
          <Table title="By hour of entry" firstColumn="Hour" rows={b.hour} kind="hour" currency={cur} view={view} />
          <p className="helper">Only hours with trades are listed. The hour follows the journal time zone, like the trading day.</p>
        </div>
        <Table title="By instrument" firstColumn="Instrument" rows={b.instrument} kind="instrument" currency={cur} view={view} />
        <Table title="By direction" firstColumn="Direction" rows={b.direction} kind="direction" currency={cur} view={view} />
        <Table title="By account" firstColumn="Account" rows={b.account} kind="account" currency={cur} view={view} />
      </div>
      <p className="helper">Rows with fewer than 10 trades are marked &quot;few trades&quot;. Every row shows its trade count: a rate is never shown without it.</p>
    </section>
  );
}
