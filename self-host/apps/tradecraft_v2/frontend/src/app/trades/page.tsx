import Link from "next/link";
import { api, ApiFailure } from "@/lib/api";
import { getAccounts, getSettings } from "@/lib/data";
import { currentMonth } from "@/lib/format";
import type { Trade } from "@/lib/types";
import { TradeFilters } from "@/components/TradeFilters";
import { TradesTable } from "@/components/TradesTable";
import { CouldNotLoad } from "@/components/Notice";
import { ExportButton } from "@/components/ExportButton";

export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function Head({ canLog, exportable = true }: { canLog: boolean; exportable?: boolean }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="title">Trades</h1>
        <p className="subtitle">Your closed trades, newest first.</p>
      </div>
      <div className="head-actions">
        {exportable && <ExportButton />}
        {canLog ? (
          <Link className="btn" href="/trades/new">Log a trade</Link>
        ) : (
          <span className="btn" aria-disabled="true" role="link" title="Create an account first">Log a trade</span>
        )}
      </div>
    </div>
  );
}

export default async function TradesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let data;
  try {
    const [settings, accounts] = await Promise.all([getSettings(), getAccounts(true)]);
    data = { settings, accounts };
  } catch {
    return (
      <>
        <Head canLog={false} exportable={false} />
        <CouldNotLoad />
      </>
    );
  }
  const { settings, accounts } = data;
  const canLog = accounts.some((a) => !a.archived);

  if (accounts.length === 0) {
    return (
      <>
        <Head canLog={false} />
        <div className="card empty">
          <h2 className="section">Create an account first.</h2>
          <p>Every trade belongs to an account. Log a trade is available as soon as you have one.</p>
          <Link className="btn" href="/accounts?new=1">New account</Link>
        </div>
      </>
    );
  }

  const month = currentMonth(settings.timeZone);
  const hasRange = "from" in sp || "to" in sp;
  const account = one(sp.account);
  const from = hasRange ? one(sp.from) : month.from;
  const to = hasRange ? one(sp.to) : month.to;
  const deleted = one(sp.deleted) === "1";

  const q = new URLSearchParams();
  if (account) q.set("accountId", account);
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (deleted) q.set("deleted", "true");

  let trades: Trade[] = [];
  let problem: string | null = null;
  let anyTrades = true;
  try {
    trades = await api<Trade[]>(`/trades?${q}`);
    if (trades.length === 0 && !deleted) anyTrades = (await api<Trade[]>("/trades")).length > 0;
  } catch (e) {
    if (e instanceof ApiFailure && e.status === 422) {
      problem = e.body?.fields?.[0]?.message ?? e.message;
    } else {
      return (
        <>
          <Head canLog={canLog} exportable={false} />
          <CouldNotLoad />
        </>
      );
    }
  }

  return (
    <>
      <Head canLog={canLog} />
      <TradeFilters accounts={accounts} account={account} from={from} to={to} deleted={deleted} />
      {deleted && !problem && (
        <p className="banner" role="status">
          <span><strong>Showing deleted trades.</strong> They are hidden everywhere else until restored.</span>
        </p>
      )}
      {problem && (
        <div className="banner" role="alert">
          <span className="banner-title">! {problem}</span>
        </div>
      )}
      {!problem && trades.length > 0 && <TradesTable trades={trades} zone={settings.timeZone} deletedView={deleted} />}
      {!problem && trades.length === 0 && !deleted && !anyTrades && (
        <div className="card empty">
          <h2 className="section">No trades yet.</h2>
          <p>Log your first trade and it appears here.</p>
          {canLog && <Link className="btn" href="/trades/new">Log a trade</Link>}
        </div>
      )}
      {!problem && trades.length === 0 && !deleted && anyTrades && (
        <div className="card empty">
          <h2 className="section">No trades for these filters.</h2>
          <p>Try another account or a wider date range.</p>
          <Link className="btn" href="/trades?from=&to=">Clear filters</Link>
        </div>
      )}
      {!problem && trades.length === 0 && deleted && (
        <div className="card empty">
          <h2 className="section">No deleted trades.</h2>
          <p>Trades you delete appear here, and can be restored.</p>
        </div>
      )}
    </>
  );
}
