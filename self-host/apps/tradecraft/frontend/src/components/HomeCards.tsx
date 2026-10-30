import type { Block, Plan, Statistic } from "@/lib/analytics";
import { stat } from "@/lib/analytics";
import { money, profitClass, ratio } from "@/lib/format";

/** "Plan followed 6 of 12 (3 not judged)": the process figure of the same trades, beside every money figure. */
export function planText(p: Plan): string {
  return `Plan followed ${p.followed} of ${p.of}${p.notJudged > 0 ? ` (${p.notJudged} not judged)` : ""}`;
}

/** A statistic's title that opens its definition (what it counts, what it leaves out). */
export function Definition({ s }: { s: Pick<Statistic, "label" | "definition"> }) {
  return (
    <details className="def">
      <summary>{s.label}</summary>
      <p className="helper">{s.definition}</p>
    </details>
  );
}

function Card({ s, value, valueClass, notes, plan }: { s: Statistic; value: React.ReactNode; valueClass?: string; notes: React.ReactNode[]; plan: Plan }) {
  return (
    <div className="card stat home-card">
      <span className="label"><Definition s={s} /></span>
      <div className={`stat-value ${valueClass ?? ""}`}>{value}</div>
      {notes.map((n, i) => <div className="helper" key={i}>{n}</div>)}
      <div className="home-plan">{planText(plan)}</div>
    </div>
  );
}

const dash = (s: Statistic) => <span title={s.reason ?? undefined}>—</span>;
const few = (s: Statistic) => (s.few ? " · few trades" : "");

/** The five headline cards of a block (H1). Every card carries its definition, its sample and its plan figure. */
export function HomeCards({ block }: { block: Block }) {
  const cur = block.currency;
  const net = stat(block, "netResult");
  const wr = stat(block, "winRate");
  const pf = stat(block, "profitFactor");
  const ex = stat(block, "expectancy");
  const er = stat(block, "expectancyR");
  const judged = block.plan.of - block.plan.notJudged;
  return (
    <>
      <div className="stat-row" role="group" aria-label={`Headline figures, ${cur}`}>
        <Card s={net} value={net.value !== null ? money(net.value, cur, true) : dash(net)} valueClass={profitClass(net.value)} notes={[`${block.trades} ${block.trades === 1 ? "trade" : "trades"} · ${cur}`]} plan={net.plan} />
        <Card
          s={{ label: "Trades", definition: "The number of closed trades in the scope, judged or not." } as Statistic}
          value={block.trades}
          notes={[`n = ${block.trades} · ${judged} judged`]}
          plan={block.plan}
        />
        <Card
          s={wr}
          value={wr.value !== null ? `${wr.wins} of ${wr.counted} (${wr.percent}%)` : dash(wr)}
          notes={[`n = ${wr.counted ?? 0}${few(wr)}`]}
          plan={wr.plan}
        />
        <Card
          s={pf}
          value={pf.value !== null ? ratio(pf.value) : dash(pf)}
          notes={[pf.value !== null ? `${money(pf.detail!.won, cur)} won / ${money(pf.detail!.lost, cur)} lost · n = ${pf.n}${few(pf)}` : (pf.reason ?? "")]}
          plan={pf.plan}
        />
        <Card
          s={ex}
          value={ex.value !== null ? money(ex.value, cur, true) : dash(ex)}
          valueClass={ex.value !== null ? profitClass(ex.value) : ""}
          notes={[
            ex.value !== null ? `per trade · n = ${ex.n}${few(ex)}` : (ex.reason ?? ""),
            er.value !== null ? `In R: ${ratio(er.value, true)} R · ${er.detail!.withR} of ${er.detail!.of} trades` : `In R: — ${er.reason}`,
          ]}
          plan={ex.plan}
        />
      </div>
      <p className="helper how">Each card has its definition: select the card title. Results are in {cur}; this page has no totals across currencies.</p>
    </>
  );
}
