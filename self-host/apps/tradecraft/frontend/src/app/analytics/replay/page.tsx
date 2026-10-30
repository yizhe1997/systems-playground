import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { getAccounts, getAnalytics, getSettings } from "@/lib/data";
import { apiQuery, resolveView } from "@/lib/analytics";
import { count } from "@/lib/format";
import { AnalyticsHead } from "@/components/AnalyticsHead";
import { PeriodScope } from "@/components/PeriodScope";
import { MistakeCostTable, ReplayTable } from "@/components/ReplayTable";
import { CouldNotLoad } from "@/components/Notice";

export const dynamic = "force-dynamic";

export const metadata = { title: "Rule replay and mistakes" };

/** Analytics, the Rule replay and mistakes tab (feature 005, H3): what the rule-breaking cost. Read-only. */
export default async function ReplayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let settings, accounts;
  try {
    [settings, accounts] = await Promise.all([getSettings(), getAccounts(true)]);
  } catch (err) {
    unstable_rethrow(err);
    return <CouldNotLoad />;
  }
  const view = resolveView(sp, settings.timeZone);
  const subtitle = "What your rule-breaking cost, and which mistakes cost it.";
  let data;
  try {
    data = await getAnalytics(apiQuery({ ...view, band: "" }));
  } catch (err) {
    unstable_rethrow(err);
    return (
      <>
        <AnalyticsHead view={view} active="replay" subtitle={subtitle} />
        <PeriodScope view={view} accounts={accounts} base="/analytics/replay" />
        <CouldNotLoad />
      </>
    );
  }
  const many = data.blocks.length > 1;
  return (
    <>
      <AnalyticsHead view={view} active="replay" subtitle={subtitle} />
      <PeriodScope view={view} accounts={accounts} base="/analytics/replay" />
      {data.blocks.length === 0 ? (
        <div className="card empty">
          {data.otherPeriods > 0 ? (
            <>
              <h2 className="section">No trades in this period.</h2>
              <p>You have {count(data.otherPeriods, "trade")} in other periods. Choose another period.</p>
              <Link className="btn" href="/analytics/replay?period=all">Show all time</Link>
            </>
          ) : (
            <>
              <h2 className="section">No trades yet.</h2>
              <p>Rule replay appears once you have logged trades and judged them in the daily review.</p>
              <Link className="btn" href="/trades/new">Log a trade</Link>
            </>
          )}
        </div>
      ) : (
        data.blocks.map((b) => (
          <div key={b.currency} className="analytics-block">
            {many && (
              <div className="block-head">
                <h2 className="section">{b.currency} accounts</h2>
                <span className="helper">{b.accounts.map((a) => a.name).join(", ")}</span>
              </div>
            )}
            <p className="scope-strip" role="status">
              {b.replay.judged === 0
                ? `Judged: 0 of ${b.replay.of} trades · ${b.currency}`
                : b.replay.judged < b.replay.of
                  ? `Based on the ${b.replay.judged} judged trades of ${b.replay.of} · ${b.replay.of - b.replay.judged} not judged yet · ${b.currency}`
                  : `Judged: ${b.replay.judged} of ${b.replay.of} trades · ${b.currency}`}
            </p>
            <ReplayTable block={b} view={view} />
            <MistakeCostTable block={b} view={view} />
          </div>
        ))
      )}
    </>
  );
}
