import Link from "next/link";
import type { Block, ReplayLine, View } from "@/lib/analytics";
import { tradesHref } from "@/lib/analytics";
import { money, profitClass } from "@/lib/format";

const LABELS: Record<ReplayLine["key"], { name: string; what: (b: Block) => string }> = {
  followed: { name: "Plan followed (Yes)", what: () => "Trades you judged as following the plan" },
  notFollowed: { name: "Plan not followed (No or Partly)", what: () => "The edge leak: what these trades cost" },
  notJudged: { name: "Not judged yet", what: () => "Neither followed nor not followed: judge them to place them" },
  actual: { name: "Actual result", what: () => "The three lines above added up" },
  without: { name: "Result without the plan-breaking trades", what: (b) => `Actual result minus the edge leak; the ${b.replay.lines.find((l) => l.key === "notJudged")!.trades} not judged stay in` },
};

const BAR_W = 700;
const BAR_H = 170;

function Bars({ block }: { block: Block }) {
  const lines = block.replay.lines;
  const vals = lines.map((l) => Number(l.netResult));
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const x = (v: number) => 220 + ((v - lo) / span) * (BAR_W - 240);
  const row = (BAR_H - 20) / lines.length;
  const short: Record<ReplayLine["key"], string> = { followed: "followed", notFollowed: "not followed", notJudged: "not judged", actual: "actual", without: "without the plan-breaking trades" };
  const label = `Bars: ${lines.map((l) => `${short[l.key]} ${money(l.netResult, block.currency, true)}`).join(", ")}`;
  return (
    <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} role="img" aria-label={label} className="chart-svg">
      <line x1={x(0)} x2={x(0)} y1={6} y2={BAR_H - 6} className="chart-zero" />
      {lines.map((l, i) => {
        const v = Number(l.netResult);
        const y = 10 + i * row;
        return (
          <g key={l.key}>
            <text x={8} y={y + row * 0.55} className="chart-tick">{LABELS[l.key].name.replace(/ \(.*\)/, "")}</text>
            <rect x={Math.min(x(v), x(0))} y={y + 2} width={Math.max(1, Math.abs(x(v) - x(0)))} height={row - 8} className={v < 0 ? "bar-loss" : "bar-profit"} />
          </g>
        );
      })}
    </svg>
  );
}

/** Rule replay (H3): the five lines that add up, the judged strip and the empty and partly judged states. */
export function ReplayTable({ block, view }: { block: Block; view: View }) {
  const { judged, of } = block.replay;
  const waiting = of - judged;
  const judgeHref = tradesHref(view, { plan: "notjudged" });
  if (judged === 0) {
    return (
      <div className="card empty">
        <h3 className="section">No trade judged yet.</h3>
        <p>Rule replay compares the trades where you followed your plan with the ones where you did not. It needs your plan answers from the daily review. {waiting} {waiting === 1 ? "trade is" : "trades are"} waiting.</p>
        <Link className="btn" href={judgeHref}>Judge the trades not judged yet</Link>
        <p className="helper">The cost of each mistake appears when trades carry a mistake tag.</p>
      </div>
    );
  }
  return (
    <section aria-label={`Rule replay, ${block.currency}`}>
      <div className="chart-head">
        <h3 className="section">Rule replay</h3>
        <span className="helper">what the period looks like without the trades where you did not follow your plan</span>
      </div>
      <div className="card card-flush">
        <table className="table">
          <thead>
            <tr><th scope="col"><span className="sr-only">Line</span></th><th scope="col" className="num">Trades</th><th scope="col" className="num">Net result</th><th scope="col">What it is</th></tr>
          </thead>
          <tbody>
            {block.replay.lines.map((l) => (
              <tr key={l.key}>
                <th scope="row">{LABELS[l.key].name}</th>
                <td className="num">{l.trades}</td>
                <td className={`num ${profitClass(l.netResult)}`}>{money(l.netResult, block.currency, true)}</td>
                <td>{LABELS[l.key].what(block)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {waiting > 0 && (
        <p className="banner" role="status">
          <span>Only {judged} of {of} trades are judged, so the edge leak covers just those. <Link href={judgeHref}>Judge the {waiting} trades not judged yet</Link> to complete it.</span>
        </p>
      )}
      <Bars block={block} />
      <p className="helper">Not judged yet is never guessed. Partly counts as not followed, because Partly never counts as following the plan.</p>
    </section>
  );
}

/** The cost of each mistake (H3). A trade with two mistakes counts under both, so the rows do not add up. */
export function MistakeCostTable({ block, view }: { block: Block; view: View }) {
  return (
    <section aria-label={`Cost of each mistake, ${block.currency}`}>
      <div className="chart-head">
        <h3 className="section">Cost of each mistake</h3>
        <span className="helper">the net result of the trades that carry each mistake tag</span>
      </div>
      {block.mistakeCost.length === 0 ? (
        <p className="helper">No trade carries a mistake tag in this period.</p>
      ) : (
        <div className="card card-flush">
          <table className="table">
            <thead>
              <tr><th scope="col">Mistake</th><th scope="col" className="num">Trades</th><th scope="col" className="num">Net result of those trades</th><th scope="col">Plan followed on them</th><th scope="col" className="num">Records</th></tr>
            </thead>
            <tbody>
              {block.mistakeCost.map((m) => (
                <tr key={m.mistakeId}>
                  <th scope="row"><Link href={tradesHref(view, { mistakeId: m.mistakeId })}>{m.name}</Link></th>
                  <td className="num">{m.trades}</td>
                  <td className={`num ${profitClass(m.netResult)}`}>{money(m.netResult, block.currency, true)}</td>
                  <td>{m.plan.followed} of {m.plan.of}</td>
                  <td className="num">{m.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="helper">A trade with two mistakes counts under both, so these rows do not add up to a total. Mistakes with no trades in the period are not listed. Select a row to open its trades.</p>
    </section>
  );
}
