import type { Preview, TradeFormValues } from "@/lib/types";
import { dayLabel, money, profitClass, rValue } from "@/lib/format";

type Props = {
  preview: Preview | null;
  values: TradeFormValues;
  currency: string | null;
  accountName: string | null;
  accountStart: string | null;
  zoneLabel: string;
  dppBlank: boolean;
};

function Row({ name, helper, children, big }: { name: string; helper?: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className={`preview-row${big ? " big" : ""}`}>
      <div>
        <div className="name">{name}</div>
        {helper && <div className="helper">{helper}</div>}
      </div>
      <div className="value">{children}</div>
    </div>
  );
}

const Dash = ({ reason }: { reason?: string }) => (
  <>
    —<span className="reason">{reason}</span>
  </>
);

/** The live figures from the same SQL rules as the saved trade. A figure that cannot be worked out is a dash and a reason. */
export function ResultPreview({ preview: p, values: v, currency, accountName, accountStart, zoneLabel, dppBlank }: Props) {
  const r = p?.reasons ?? {};
  const short = v.direction === "short";
  const grossFormula = p?.grossResult != null ? `(${short ? v.entryPrice : v.exitPrice} - ${short ? v.exitPrice : v.entryPrice}) x ${v.size} x ${v.dollarsPerPoint}` : undefined;
  const riskFormula = p?.risk != null ? `|${v.entryPrice} - ${v.stopPrice}| x ${v.size} x ${v.dollarsPerPoint}` : undefined;
  const cost = p?.costs != null ? (/^[0.]*$/.test(p.costs) ? "0" : "-" + p.costs) : null;
  const dayHelper = accountName
    ? `entry read in ${zoneLabel}; ${accountName} ${accountStart ? `starts its trading day at ${accountStart}` : "has no trading-day start"}`
    : `entry read in ${zoneLabel}`;

  return (
    <section className="card" aria-labelledby="preview-title" aria-live="polite">
      <h2 className="section" id="preview-title">Result preview</h2>
      <div style={{ marginTop: 8 }}>
        <Row name="Gross result" helper={grossFormula}>
          {p?.grossResult != null ? money(p.grossResult, currency, true) : <Dash reason={r.grossResult ?? "needs prices, size and dollars per point"} />}
        </Row>
        <Row name="Costs" helper={dppBlank ? "a typed result is already after costs" : undefined}>
          {dppBlank ? <>not used</> : cost !== null ? money(cost, currency) : <Dash reason={r.costs} />}
        </Row>
        <Row name="Net result" big>
          {p?.netResult != null ? (
            <>
              <span className={profitClass(p.netResult)}>{money(p.netResult, currency, true)}</span>
              {dppBlank && <span className="reason">typed in</span>}
            </>
          ) : (
            <Dash reason={r.netResult} />
          )}
        </Row>
        <Row name="Risk" helper={riskFormula}>
          {p?.risk != null ? money(p.risk, currency) : <Dash reason={r.risk ?? "needs a stop and dollars per point"} />}
        </Row>
        <Row name="R" helper={p?.rMultiple != null ? "net result over risk" : undefined}>
          {p?.rMultiple != null ? rValue(p.rMultiple) : <Dash reason={r.rMultiple ?? "needs a net result and a risk"} />}
        </Row>
        <Row name="Trading day" helper={dayHelper}>
          {p?.tradingDay ? dayLabel(p.tradingDay) : <Dash reason={r.tradingDay ?? "needs an entry time"} />}
        </Row>
      </div>
      <p className="helper" style={{ marginTop: 8 }}>All money is exact. Nothing is rounded until it is shown.</p>
    </section>
  );
}
