import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { getAccounts, getAnalytics, getSettings } from "@/lib/data";
import { apiQuery, resolveView } from "@/lib/analytics";
import { count } from "@/lib/format";
import { AnalyticsHead } from "@/components/AnalyticsHead";
import { PeriodScope } from "@/components/PeriodScope";
import { ScopeStrip, StatTable } from "@/components/StatTable";
import { Breakdowns } from "@/components/BreakdownTable";
import { CouldNotLoad } from "@/components/Notice";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

/** Analytics, the Statistics tab (feature 005, H2): is there an edge, and where does it live. Read-only. */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let settings, accounts;
  try {
    [settings, accounts] = await Promise.all([getSettings(), getAccounts(true)]);
  } catch (err) {
    unstable_rethrow(err);
    return <CouldNotLoad />;
  }
  const view = resolveView(sp, settings.timeZone);
  const subtitle = "Is there an edge, where does it live, and where does it leak.";
  let data;
  try {
    data = await getAnalytics(apiQuery(view));
  } catch (err) {
    unstable_rethrow(err);
    return (
      <>
        <AnalyticsHead view={view} active="statistics" subtitle={subtitle} />
        <PeriodScope view={view} accounts={accounts} base="/analytics" withBand />
        <CouldNotLoad />
      </>
    );
  }
  const many = data.blocks.length > 1;
  return (
    <>
      <AnalyticsHead view={view} active="statistics" subtitle={subtitle} />
      <PeriodScope view={view} accounts={accounts} base="/analytics" withBand />
      {data.blocks.length === 0 ? (
        <div className="card empty">
          {data.otherPeriods > 0 ? (
            <>
              <h2 className="section">No trades in this period.</h2>
              <p>You have {count(data.otherPeriods, "trade")} in other periods. Choose another period.</p>
              <Link className="btn" href="/analytics?period=all">Show all time</Link>
            </>
          ) : (
            <>
              <h2 className="section">No trades yet.</h2>
              <p>The statistics appear once you have logged trades.</p>
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
            <ScopeStrip block={b} band={data.band === "0" ? "" : data.band} />
            <StatTable block={b} />
            <Breakdowns block={b} view={view} />
            <p className="helper">
              Rule replay and the cost of each mistake are on their own tab: <Link href="/analytics/replay">Open Rule replay and mistakes</Link>
            </p>
          </div>
        ))
      )}
    </>
  );
}
