import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { apiPaged, ApiFailure } from "@/lib/api";
import { getAuditKinds, getIdentities, getSettings } from "@/lib/data";
import { currentMonth } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";
import { CouldNotLoad } from "@/components/Notice";
import { AuditFilters } from "@/components/AuditFilters";
import { AuditTable } from "@/components/AuditTable";
import { Pager } from "@/components/Pager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

function Head() {
  return (
    <div className="page-head">
      <div>
        <h1 className="title">Audit log</h1>
        <p className="subtitle">Who did what, newest first. Entries are never edited or removed.</p>
      </div>
    </div>
  );
}

export default async function AuditPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const identity = one(sp.identity);
  const kind = one(sp.kind);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  let settings, identities, kinds;
  try {
    [settings, { identities }, kinds] = await Promise.all([getSettings(), getIdentities(), getAuditKinds()]);
  } catch (e) {
    unstable_rethrow(e);
    return (
      <>
        <Head />
        <CouldNotLoad />
      </>
    );
  }

  const q = new URLSearchParams();
  if (identity) q.set("identity", identity);
  if (kind) q.set("kind", kind);
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const filtered = q.size > 0;
  q.set("limit", String(PAGE_SIZE));
  q.set("offset", String((page - 1) * PAGE_SIZE));

  let entries: AuditEntry[] = [];
  let total = 0;
  let problem: string | null = null;
  try {
    ({ data: entries, total } = await apiPaged<AuditEntry>(`/audit?${q}`));
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiFailure && e.status === 422) {
      problem = e.body?.fields?.[0]?.message ?? e.message;
    } else {
      return (
        <>
          <Head />
          <CouldNotLoad />
        </>
      );
    }
  }
  const month = currentMonth(settings.timeZone);

  return (
    <>
      <Head />
      <AuditFilters identity={identity} kind={kind} from={from} to={to} identities={identities} kinds={kinds} monthFrom={month.from} monthTo={month.to} />
      {problem && (
        <div className="banner" role="alert">
          <span className="banner-title">! {problem}</span>
        </div>
      )}
      {!problem && entries.length > 0 && <AuditTable entries={entries} zone={settings.timeZone} />}
      {!problem && total > PAGE_SIZE && (
        <Pager page={page} pageSize={PAGE_SIZE} total={total} path="/audit" keepEmpty={[]} label="Pages of the audit log" params={{ identity, kind, from, to }} />
      )}
      {!problem && entries.length > 0 && total <= PAGE_SIZE && (
        <p className="helper" role="status">Showing 1 to {total} of {total}</p>
      )}
      {!problem && entries.length === 0 && !filtered && (
        <div className="card empty">
          <h2 className="section">Nothing recorded yet.</h2>
          <p>Sign-ins, identity changes, exports and other sensitive actions appear here, newest first.</p>
        </div>
      )}
      {!problem && entries.length === 0 && filtered && (
        <div className="card empty">
          <h2 className="section">No entries for these filters.</h2>
          <p>Try another identity, kind or a wider period.</p>
          <Link className="btn" href="/audit">Clear filters</Link>
        </div>
      )}
    </>
  );
}
