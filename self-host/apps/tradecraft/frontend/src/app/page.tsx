import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { getAccounts, getAnalytics, getCounter, getDay, getNeedsYou, getSettings } from "@/lib/data";
import { apiQuery, resolveView } from "@/lib/analytics";
import { todayIn, count } from "@/lib/format";
import type { DailyReview } from "@/lib/types";
import { PeriodScope } from "@/components/PeriodScope";
import { CurrencyBlocks } from "@/components/CurrencyBlocks";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { FocusPanel, MistakePanel } from "@/components/HomeSide";
import { NeedsYou } from "@/components/NeedsYou";
import { CouldNotLoad } from "@/components/Notice";

export const dynamic = "force-dynamic";

function Head() {
  return (
    <div className="page-head">
      <div>
        <h1 className="title">Home</h1>
        <p className="subtitle">How you are doing, and what is waiting for you.</p>
      </div>
    </div>
  );
}

/** Home (feature 005, H1): the landing page. Everything on it is read-only and made for one period and account scope. */
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let settings, accounts;
  try {
    [settings, accounts] = await Promise.all([getSettings(), getAccounts(true)]);
  } catch (err) {
    unstable_rethrow(err);
    return (
      <>
        <Head />
        <CouldNotLoad />
      </>
    );
  }
  if (accounts.length === 0) {
    return (
      <>
        <Head />
        <div className="card empty">
          <h2 className="section">Create an account first.</h2>
          <p>Every trade belongs to an account. Home shows how you are doing once you have logged trades.</p>
          <Link className="btn" href="/accounts?new=1">New account</Link>
        </div>
      </>
    );
  }
  const view = resolveView(sp, settings.timeZone);
  const today = todayIn(settings.timeZone);
  let data, needs, review: DailyReview | null = null, counter;
  try {
    data = await getAnalytics(apiQuery(view));
    const focusAccount = view.account || data.blocks[0]?.days.at(-1)?.openAccountId || accounts.find((a) => a.kind === "live" && !a.archived)?.id;
    [needs, review, counter] = await Promise.all([
      getNeedsYou(apiQuery(view)),
      focusAccount ? getDay(focusAccount, today).catch(() => null) : Promise.resolve(null),
      getCounter("month", today, view.account || undefined),
    ]);
  } catch (err) {
    unstable_rethrow(err);
    return (
      <>
        <Head />
        <PeriodScope view={view} accounts={accounts} base="/" />
        <CouldNotLoad />
      </>
    );
  }
  const { blocks } = data;
  const total = blocks.reduce((n, b) => n + b.trades, 0);
  const allUnjudged = total > 0 && blocks.every((b) => b.plan.notJudged === b.plan.of);

  return (
    <>
      <Head />
      <PeriodScope view={view} accounts={accounts} base="/" />
      {total === 0 ? (
        data.otherPeriods > 0 ? (
          <div className="card empty">
            <h2 className="section">No trades in this period.</h2>
            <p>You have {count(data.otherPeriods, "trade")} in other periods. Choose another period.</p>
            <Link className="btn" href="/?period=all">Show all time</Link>
          </div>
        ) : (
          <div className="card empty">
            <h2 className="section">No trades yet.</h2>
            <p>Home shows how you are doing once you have logged trades: your result, how many followed the plan, and what is waiting for you.</p>
            <Link className="btn" href="/trades/new">Log a trade</Link>
            <p className="helper">Trades you log appear here with the plan answers you give in the daily review. Nothing is shown as zero until there is something to count.</p>
          </div>
        )
      ) : (
        <>
          {allUnjudged && (
            <p className="banner" role="status">
              <span><strong>None of these {total} trades is judged yet.</strong> Judge them in the daily review to see how the plan did.</span>
            </p>
          )}
          <CurrencyBlocks blocks={blocks} />
          <div className="home-grid">
            <CalendarHeatmap blocks={blocks} from={data.from} to={data.to} />
            <div className="home-side">
              <NeedsYou needs={needs} view={view} zone={settings.timeZone} />
              <FocusPanel review={review} today={today} />
              <MistakePanel counter={counter} today={today} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
