import Link from "next/link";
import type { DayTrade, Stats } from "@/lib/types";
import { JudgeButton } from "@/components/JudgeButton";
import { clock, count, money, plain, profitClass } from "@/lib/format";
import { cookies } from "next/headers";
import { ReorderTable } from "@/components/ReorderTable";
import { readColumnOrder } from "@/lib/columnOrder";

const PLAN: Record<string, string> = { yes: "Yes", partly: "Partly", no: "No" };

/** The day's trades with the result and the judgement side by side ("The result is the outcome; the judgement is what counts."). */
export async function DayTradesTable({ trades, stats, zone, zoneLabel, accountName }: { trades: DayTrade[]; stats: Stats; zone: string; zoneLabel: string; accountName: string }) {
  return (
    <section className="card section-card" aria-labelledby="trades-title">
      <div className="section-head">
        <h2 className="section" id="trades-title">Trades</h2>
        <span className="helper">{zoneLabel}. The result is the outcome; the judgement is what counts.</span>
      </div>
      <ReorderTable
        id="day-trades"
        tableClass="trade-grid"
        initialOrder={readColumnOrder(await cookies(), "day-trades")}
        rowKeys={trades.map((t) => t.id)}
        columns={[
          { key: "entry", label: "Entry time", cells: trades.map((t) => clock(t.entryAt, zone)) },
          { key: "instrument", label: "Instrument", className: "instrument", cells: trades.map((t) => t.instrument) },
          { key: "side", label: "Side", cells: trades.map((t) => (t.direction === "long" ? "Long" : "Short")) },
          { key: "size", label: "Size", className: "num", cells: trades.map((t) => plain(t.size)) },
          {
            key: "result", label: "Result", className: "num",
            cells: trades.map((t) => <span className={profitClass(t.netResult)}>{t.netResult !== null ? money(t.netResult, t.currency, true) : "—"}</span>),
          },
          {
            key: "plan", label: "Followed plan",
            cells: trades.map((t) => (t.judgement.planFollowed ? <span className="chip">{PLAN[t.judgement.planFollowed]}</span> : <span className="helper">—</span>)),
          },
          {
            key: "judgement", label: "Judgement",
            cells: trades.map((t) =>
              t.judgement.label === "mistake" ? (
                <span className="chip chip-solid">Mistake</span>
              ) : t.judgement.label === "valid_loss" ? (
                <span className="chip">Valid loss</span>
              ) : (
                <span className="helper">Not judged yet</span>
              ),
            ),
          },
          {
            key: "mistakes", label: "Mistakes",
            cells: trades.map((t) => (t.judgement.mistakes.length > 0 ? t.judgement.mistakes.join(", ") : <span className="helper">—</span>)),
          },
        ]}
        end={{
          label: "Actions",
          cells: trades.map((t) => (
            <JudgeButton tradeId={t.id} accountName={accountName} zone={zone} label={`${t.instrument} ${t.direction === "long" ? "Long" : "Short"} at ${clock(t.entryAt, zone)}`} />
          )),
        }}
      />
      <div className="form-actions" style={{ marginTop: 12 }}>
        <span className="helper">
          Day total {stats.netResult !== null ? money(stats.netResult, stats.currency, true) : "—"} across {count(stats.trades, "trade")}, {stats.planFollowed.followed} followed the plan.
        </span>
        <span className="spacer" />
        <Link className="btn" href="/trades/new">Add a trade</Link>
      </div>
    </section>
  );
}
