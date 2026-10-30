import type { Block, Statistic } from "@/lib/analytics";
import { stat } from "@/lib/analytics";
import { dayLabel, money, ratio } from "@/lib/format";

const planOf = (s: Statistic) => (s.n > 0 ? `${s.plan.followed} of ${s.plan.of}` : "—");

/** The value of a statistic in words, or null for a dash. Money and ratios are only rounded here, for display. */
function valueText(s: Statistic, cur: string): string | null {
  if (s.value === null) return null;
  switch (s.key) {
    case "winRate":
      return `${s.wins} of ${s.counted} (${s.percent}%)${s.few ? "  few trades" : ""}`;
    case "profitFactor":
    case "payoffRatio":
      return ratio(s.value) + (s.few ? "  few trades" : "");
    case "expectancy":
      return `${money(s.value, cur, true)} per trade${s.few ? "  few trades" : ""}`;
    case "expectancyR":
      return `${ratio(s.value, true)} R${s.few ? "  few trades" : ""}`;
    case "largestWin":
    case "largestLoss":
      return `${money(s.value, cur, true)} (${dayLabel(s.day!, false)})`;
    case "winStreak":
    case "lossStreak":
      return `${s.value} ${s.value === "1" ? "trade" : "trades"} (${s.from === s.to ? dayLabel(s.from!, false) : `${dayLabel(s.from!, false)} to ${dayLabel(s.to!, false)}`})`;
    case "maxDrawdown":
      return money(s.value, cur, true);
    default:
      return money(s.value, cur, true);
  }
}

/** The scope strip of Analytics (H2): what these figures cover, in one line. */
export function ScopeStrip({ block, band }: { block: Block; band: string }) {
  const er = stat(block, "expectancyR");
  const wr = stat(block, "winRate");
  const p = block.plan;
  const parts = [
    `${block.trades} ${block.trades === 1 ? "trade" : "trades"}, ${block.currency}`,
    `Plan followed ${p.followed} of ${p.of}`,
    `${p.notJudged} not judged yet`,
    `R known for ${er.detail?.withR ?? 0} of ${block.trades} trades`,
  ];
  if (band && wr.setAside) parts.push(`${wr.setAside} ${wr.setAside === 1 ? "trade" : "trades"} inside the break-even band set aside from the win rate`);
  return <p className="scope-strip" role="status">{parts.join(" · ")}</p>;
}

/** The performance table (H2): every statistic with its value, sample, plan figure and definition. */
export function StatTable({ block }: { block: Block }) {
  const dd = stat(block, "maxDrawdown");
  return (
    <section aria-label={`Performance, ${block.currency}`}>
      <h3 className="section">Performance</h3>
      <div className="card card-flush">
        <table className="table stat-table">
          <thead>
            <tr>
              <th scope="col">Statistic</th>
              <th scope="col">Value</th>
              <th scope="col" className="num">n</th>
              <th scope="col">Plan followed (same trades)</th>
              <th scope="col"><span className="sr-only">Definition</span></th>
            </tr>
          </thead>
          <tbody>
            {block.statistics.map((s) => {
              const text = valueText(s, block.currency);
              return (
                <tr key={s.key}>
                  <th scope="row">{s.label}</th>
                  <td className={text === null ? "muted" : ""}>{text ?? `— ${s.reason}`}</td>
                  <td className="num">{s.n}</td>
                  <td>{planOf(s)}</td>
                  <td>
                    <details className="def">
                      <summary>Definition</summary>
                      <p className="helper def-text">{s.definition}</p>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dd.value !== null && dd.peak !== undefined && dd.trough !== undefined && (
        <p className="helper">
          Maximum drawdown is the largest fall of the running result from a peak ({money(dd.peak, block.currency)}{" "}
          {dd.peakDay ? `on ${dayLabel(dd.peakDay, false)}` : "at the start"}) to a trough ({money(dd.trough, block.currency)} on{" "}
          {dayLabel(dd.troughDay!, false)}). It is in money: there is no capital to take a percentage of.
        </p>
      )}
    </section>
  );
}
