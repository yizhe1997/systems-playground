import type { Trade } from "@/lib/types";
import { dateTime, dayLabel, money, plain, profitClass, rValue } from "@/lib/format";
import { cookies } from "next/headers";
import { RowActions } from "@/components/TradeRowActions";
import { RowMenu } from "@/components/RowMenu";
import { ReorderTable } from "@/components/ReorderTable";
import { readColumnOrder } from "@/lib/columnOrder";

function ResultCell({ t }: { t: Trade }) {
  if (t.netResult === null) return <>—</>;
  return (
    <>
      <span className={profitClass(t.netResult)}>{money(t.netResult, t.currency, true)}</span>
      {t.typedResult !== null && <span className="reason">typed in</span>}
    </>
  );
}

const PLAN: Record<string, string> = { yes: "Followed", partly: "Partly", no: "Not followed" };

/** The plan answer from the daily review beside the result, so the result never stands alone (principle I). */
function PlanCell({ t }: { t: Trade }) {
  return (
    <>
      {t.planFollowed ? PLAN[t.planFollowed] : "Not judged yet"}
      {t.label && <span className="reason">{t.label === "mistake" ? "Mistake" : "Valid loss"}</span>}
    </>
  );
}

function RCell({ t }: { t: Trade }) {
  if (t.rMultiple !== null) return <>{rValue(t.rMultiple)}</>;
  const reason = t.dollarsPerPoint === null ? "no dollars per point" : (t.reasons.rMultiple ?? "");
  return (
    <>
      —<span className="reason">{reason}</span>
    </>
  );
}

export async function TradesTable({ trades, zone, deletedView, backtestIds = [] }: { trades: Trade[]; zone: string; deletedView: boolean; backtestIds?: string[] }) {
  const backtest = new Set(backtestIds);
  const labelOf = (t: Trade) => `${t.instrument} ${t.direction} trade of ${dateTime(t.entryAt, zone)}`;
  return (
    <RowActions>
    <div className="card card-flush">
      <ReorderTable
        id="trades"
        tableClass="table trades-table"
        initialOrder={readColumnOrder(await cookies(), "trades")}
        rowKeys={trades.map((t) => t.id)}
        rowClasses={trades.map(() => (deletedView ? "muted-row" : undefined))}
        columns={[
          { key: "entry", label: "Entry time", cells: trades.map((t) => dateTime(t.entryAt, zone)) },
          { key: "exit", label: "Exit time", cells: trades.map((t) => dateTime(t.exitAt, zone)) },
          { key: "day", label: "Trading day", cells: trades.map((t) => dayLabel(t.tradingDay, false)) },
          {
            key: "account", label: "Account", className: "account",
            cells: trades.map((t) => (
              <>
                {t.accountName}
                {backtest.has(t.accountId) && <span className="tag">Backtest</span>}
              </>
            )),
          },
          {
            key: "instrument", label: "Instrument", className: "instrument",
            cells: trades.map((t) => (
              <>
                {t.instrument}
                {deletedView && <span className="tag tag-dashed">Deleted</span>}
              </>
            )),
          },
          { key: "direction", label: "Direction", cells: trades.map((t) => (t.direction === "long" ? "Long" : "Short")) },
          { key: "size", label: "Size", className: "num", cells: trades.map((t) => plain(t.size)) },
          { key: "net", label: "Net result", className: "num tall", cells: trades.map((t) => <ResultCell t={t} />) },
          { key: "plan", label: "Plan", className: "tall", cells: trades.map((t) => <PlanCell t={t} />) },
          { key: "r", label: "R", className: "num tall", cells: trades.map((t) => <RCell t={t} />) },
        ]}
        end={{
          label: "Actions",
          className: "actions",
          cells: trades.map((t) =>
            deletedView ? (
              <button type="button" className="btn" data-restore={t.id} aria-label={`Restore ${labelOf(t)}`}>Restore</button>
            ) : (
              <RowMenu
                name={labelOf(t)}
                items={[
                  { label: "Edit", href: `/trades/${t.id}/edit` },
                  { label: "Delete", attrs: { "data-delete": t.id } },
                ]}
              />
            ),
          ),
        }}
      />
      <p className="helper table-foot">Each result is in its own account&apos;s currency. This list has no totals. The plan answer comes from the daily review.</p>
    </div>
    </RowActions>
  );
}
