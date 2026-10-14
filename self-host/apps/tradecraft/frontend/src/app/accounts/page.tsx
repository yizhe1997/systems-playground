import { unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { readColumnOrder } from "@/lib/columnOrder";
import { PAGE_SIZES, PAGE_SIZE_COOKIE, pickPageSize } from "@/lib/pageSize";
import { Pager } from "@/components/Pager";
import { getAccounts, getCurrencies } from "@/lib/data";
import { CouldNotLoad } from "@/components/Notice";
import { AccountsView } from "@/components/AccountsTable";

export const dynamic = "force-dynamic";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  let accounts, currencies;
  try {
    [accounts, currencies] = await Promise.all([getAccounts(showArchived), getCurrencies()]);
  } catch (err) {
    unstable_rethrow(err);
    return (
      <>
        <div className="page-head">
          <div>
            <h1 className="title">Accounts</h1>
            <p className="subtitle">Where your trades happen.</p>
          </div>
        </div>
        <CouldNotLoad />
      </>
    );
  }
  // the API answers every account; the list is paged here like the others
  const store = await cookies();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const size = pickPageSize(one(sp.size), store.get(PAGE_SIZE_COOKIE)?.value);
  const total = accounts.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(sp.page) ?? "", 10) || 1));
  return (
    <AccountsView
      accounts={accounts.slice((page - 1) * size, page * size)}
      currencies={currencies}
      showArchived={showArchived}
      openNew={sp.new === "1"}
      columnOrder={readColumnOrder(store, "accounts")}
      pager={
        total > PAGE_SIZES[0] ? (
          <Pager page={page} pageSize={size} total={total} params={{ archived: showArchived ? "1" : "" }} path="/accounts" label="Pages of accounts" />
        ) : null
      }
    />
  );
}
