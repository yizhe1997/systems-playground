import type { Stats } from "@/lib/types";
import { count, money, planDetail, profitClass } from "@/lib/format";

export const HOW_COUNTED =
  "How these are counted: followed = answered Yes (Partly does not count) · win = net result above zero · mistakes = each tag and each whole-day record once · deleted trades never count.";

function Stat({ label, value, sub, valueClass }: { label: string; value: React.ReactNode; sub: React.ReactNode; valueClass?: string }) {
  return (
    <div className="card stat">
      <span className="label">{label}</span>
      <div className={`stat-value ${valueClass ?? ""}`}>{value}</div>
      <div className="helper">{sub}</div>
    </div>
  );
}

/** The figures of a day or a week with the process figure beside every money figure, and how they are counted. */
export function NumbersStrip({ stats }: { stats: Stats }) {
  const p = stats.planFollowed;
  const byName = stats.mistakes.byMistake.map((m) => `${m.name} x${m.count}`).join(", ");
  return (
    <>
      <div className="stat-row">
        <Stat
          label="Net result"
          value={stats.netResult !== null ? money(stats.netResult, stats.currency, true) : "—"}
          valueClass={stats.netResult !== null ? profitClass(stats.netResult) : ""}
          sub={stats.netResult !== null ? `Plan followed on ${p.followed} of ${count(p.of, "trade")}` : stats.reasons.netResult}
        />
        <Stat label="Plan followed" value={stats.trades > 0 ? `${p.followed} of ${p.of}` : "—"} sub={stats.trades > 0 ? planDetail(p) : "no trades"} />
        <Stat label="Mistakes" value={stats.mistakes.count} sub={byName || "none recorded"} />
        <Stat label="Valid losses" value={stats.validLosses.count} sub={`of ${count(stats.validLosses.losingTrades, "losing trade")}`} />
        <Stat
          label="Win rate"
          value={stats.trades > 0 ? `${stats.winRate.wins} of ${stats.winRate.trades}` : "—"}
          sub={stats.trades > 0 ? `${count(stats.winRate.wins, "winning trade")} of ${stats.winRate.trades}${stats.winRate.percent !== null ? ` · ${stats.winRate.percent}%` : ""}` : stats.reasons.winRate}
        />
      </div>
      <p className="helper how">{HOW_COUNTED}</p>
    </>
  );
}
