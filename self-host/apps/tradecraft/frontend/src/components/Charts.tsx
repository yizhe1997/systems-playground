import type { Block } from "@/lib/analytics";
import { dayLabel, money } from "@/lib/format";

// The equity curve and the daily bars of Home (H1): plain SVG drawn on the server, with the same numbers in a table
// beside each (a chart is never the only way to read a figure). Geometry uses numbers; money is only ever shown from
// the exact decimal strings.

const W = 700;
const H = 230;
const PAD = { l: 56, r: 16, t: 16, b: 28 };

const num = (s: string) => Number(s);

function scale(values: number[]) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  return { lo, hi, y: (v: number) => PAD.t + ((hi - v) / span) * (H - PAD.t - PAD.b) };
}

function Table({ block, label }: { block: Block; label: string }) {
  return (
    <details className="chart-table">
      <summary>View as table</summary>
      <table className="table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr><th scope="col">Trading day</th><th scope="col" className="num">Result</th><th scope="col" className="num">Running result</th></tr>
        </thead>
        <tbody>
          {block.curve.map((p) => (
            <tr key={p.day}>
              <th scope="row">{dayLabel(p.day)}</th>
              <td className="num">{money(p.result, block.currency, true)}</td>
              <td className="num">{money(p.cumulative, block.currency, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function EquityCurve({ block }: { block: Block }) {
  const pts = block.curve;
  if (pts.length === 0) return null;
  const cum = pts.map((p) => num(p.cumulative));
  const { lo, hi, y } = scale(cum);
  const x = (i: number) => PAD.l + (pts.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (pts.length - 1)) * (W - PAD.l - PAD.r));
  const low = cum.indexOf(Math.min(...cum));
  const last = pts[pts.length - 1];
  const label = `Equity curve: line from ${money("0", block.currency)} to ${money(last.cumulative, block.currency, true)} over ${pts.length} trading ${pts.length === 1 ? "day" : "days"}, lowest point ${money(pts[low].cumulative, block.currency, true)} on ${dayLabel(pts[low].day, false)}`;
  return (
    <section className="chart" aria-label={`Equity curve, ${block.currency}`}>
      <div className="chart-head">
        <h3 className="section">Equity curve</h3>
        <span className="helper">cumulative net result by trading day, {block.currency}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="chart-svg">
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="chart-zero" />
        <text x={PAD.l - 8} y={y(0) + 4} textAnchor="end" className="chart-tick">0</text>
        <text x={PAD.l - 8} y={y(hi) + 4} textAnchor="end" className="chart-tick">{money(String(hi), block.currency)}</text>
        {lo < 0 && <text x={PAD.l - 8} y={y(lo) + 4} textAnchor="end" className="chart-tick">{money(String(lo), block.currency)}</text>}
        <polyline fill="none" className="chart-line" points={cum.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
        <circle cx={x(low)} cy={y(cum[low])} r={4} className="chart-low" />
        <text x={x(0)} y={H - 8} className="chart-tick">{dayLabel(pts[0].day, false)}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className="chart-tick">{dayLabel(last.day, false)}</text>
      </svg>
      <Table block={block} label={label} />
    </section>
  );
}

const WB = 440; // the daily bars sit in the narrower column

export function DailyBars({ block }: { block: Block }) {
  const pts = block.curve;
  if (pts.length === 0) return null;
  const res = pts.map((p) => num(p.result));
  const { y } = scale(res);
  const slot = (WB - PAD.l - PAD.r) / pts.length;
  const bw = Math.max(2, Math.min(28, slot * 0.7));
  const best = res.indexOf(Math.max(...res));
  const worst = res.indexOf(Math.min(...res));
  const label = `Daily bars: ${pts.length} trading ${pts.length === 1 ? "day" : "days"}, from ${money(pts[worst].result, block.currency, true)} (${dayLabel(pts[worst].day, false)}) to ${money(pts[best].result, block.currency, true)} (${dayLabel(pts[best].day, false)})`;
  return (
    <section className="chart" aria-label={`Daily result, ${block.currency}`}>
      <div className="chart-head">
        <h3 className="section">Daily result</h3>
        <span className="helper">net result per trading day</span>
      </div>
      <svg viewBox={`0 0 ${WB} ${H}`} role="img" aria-label={label} className="chart-svg">
        <line x1={PAD.l} x2={WB - PAD.r} y1={y(0)} y2={y(0)} className="chart-zero" />
        <text x={PAD.l - 8} y={y(0) + 4} textAnchor="end" className="chart-tick">0</text>
        {res.map((v, i) => {
          const top = Math.min(y(v), y(0));
          return <rect key={pts[i].day} x={PAD.l + i * slot + (slot - bw) / 2} y={top} width={bw} height={Math.max(1, Math.abs(y(v) - y(0)))} className={v < 0 ? "bar-loss" : "bar-profit"} />;
        })}
      </svg>
      <p className="helper">The table beside the equity curve lists every day.</p>
    </section>
  );
}
