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
  } catch {
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
  return <AccountsView accounts={accounts} currencies={currencies} showArchived={showArchived} openNew={sp.new === "1"} />;
}
