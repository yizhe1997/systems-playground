import Link from "next/link";
import type { DayTrade, Stats } from "@/lib/types";
import { JudgeButton } from "@/components/JudgeButton";
import { clock, count, money, plain, profitClass } from "@/lib/format";

const PLAN: Record<string, string> = { yes: "Yes", partly: "Partly", no: "No" };

/** The day's trades with the result and the judgement side by side ("The result is the outcome; the judgement is what counts."). */
export function DayTradesTable({ trades, stats, zone, zoneLabel, accountName }: { trades: DayTrade[]; stats: Stats; zone: string; zoneLabel: string; accountName: string }) {
  return (
    <section className="card section-card" aria-labelledby="trades-title">
      <div className="section-head">
        <h2 className="section" id="trades-title">Trades</h2>
        <span className="helper">{zoneLabel}. The result is the outcome; the judgement is what counts.</span>
      </div>
      <div className="table-wrap">
        <table className="trade-grid">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Instrument</th>
              <th scope="col">Side</th>
              <th scope="col">Size</th>
              <th scope="col">Result</th>
              <th scope="col">Followed plan</th>
              <th scope="col">Judgement</th>
              <th scope="col">Mistakes</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id}>
                <td>{clock(t.exitAt, zone)}</td>
                <td className="instrument">{t.instrument}</td>
                <td>{t.direction === "long" ? "Long" : "Short"}</td>
                <td className="num">{plain(t.size)}</td>
                <td className={`num ${profitClass(t.netResult)}`}>{t.netResult !== null ? money(t.netResult, t.currency, true) : "—"}</td>
                <td>{t.judgement.planFollowed ? <span className="chip">{PLAN[t.judgement.planFollowed]}</span> : <span className="helper">—</span>}</td>
                <td>
                  {t.judgement.label === "mistake" ? (
                    <span className="chip chip-solid">Mistake</span>
                  ) : t.judgement.label === "valid_loss" ? (
                    <span className="chip">Valid loss</span>
                  ) : (
                    <span className="helper">Not judged yet</span>
                  )}
                </td>
                <td>{t.judgement.mistakes.length > 0 ? t.judgement.mistakes.join(", ") : <span className="helper">—</span>}</td>
                <td><JudgeButton tradeId={t.id} accountName={accountName} zone={zone} label={`${t.instrument} ${t.direction === "long" ? "Long" : "Short"} at ${clock(t.exitAt, zone)}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
