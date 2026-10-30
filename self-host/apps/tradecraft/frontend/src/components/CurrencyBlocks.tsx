import type { Block } from "@/lib/analytics";
import { HomeCards } from "@/components/HomeCards";
import { DailyBars, EquityCurve } from "@/components/Charts";

/** One block per currency (H1): the cards and the two charts. With one currency there is no heading. */
export function CurrencyBlocks({ blocks }: { blocks: Block[] }) {
  const many = blocks.length > 1;
  return (
    <>
      {many && (
        <p className="banner" role="status">
          <span><strong>Your accounts use {blocks.length} currencies.</strong> Figures are shown once per currency and are never added together.</span>
        </p>
      )}
      {blocks.map((b) => (
        <section key={b.currency} className="currency-block" aria-label={many ? `${b.currency} accounts` : undefined}>
          {many && (
            <div className="block-head">
              <h2 className="section">{b.currency} accounts</h2>
              <span className="helper">{b.accounts.map((a) => a.name).join(", ")}</span>
            </div>
          )}
          <HomeCards block={b} />
          <div className="charts">
            <EquityCurve block={b} />
            <DailyBars block={b} />
          </div>
        </section>
      ))}
    </>
  );
}
