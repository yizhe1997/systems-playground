"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { AccountDialog } from "@/components/AccountDialog";
import { FailureBanner, useToast } from "@/components/Notice";
import { RowMenu } from "@/components/RowMenu";
import { ReorderTable } from "@/components/ReorderTable";

export function AccountsView({
  accounts, currencies, showArchived, openNew, columnOrder = [], pager = null,
}: { accounts: Account[]; currencies: string[]; showArchived: boolean; openNew: boolean; columnOrder?: string[]; pager?: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<{ account: Account | null } | null>(openNew ? { account: null } : null);
  const [failure, setFailure] = useState<string | null>(null);

  const setArchived = async (a: Account, archive: boolean) => {
    const r = await call("POST", `/accounts/${a.id}/${archive ? "archive" : "restore"}`);
    if (!r.ok) return setFailure(r.unreachable ? "Could not reach the journal. Nothing was changed." : r.error.message);
    setFailure(null);
    if (archive) {
      toast({ text: "Account archived.", actionLabel: "Undo", onAction: async () => { await call("POST", `/accounts/${a.id}/restore`); router.refresh(); } });
    }
    router.refresh();
  };

  const close = () => {
    setDialog(null);
    if (openNew) router.replace("/accounts"); // the "?new=1" has done its job
  };

  const none = accounts.length === 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Accounts</h1>
          <p className="subtitle">Where your trades happen.</p>
        </div>
        <div className="head-actions">
          <label className="switch">
            <input type="checkbox" checked={showArchived} onChange={(e) => router.replace(e.target.checked ? "/accounts?archived=1" : "/accounts")} />
            <span className="track" aria-hidden="true" />
            <span>Show archived</span>
          </label>
          <button type="button" className="btn" onClick={() => setDialog({ account: null })}>New account</button>
        </div>
      </div>

      {failure && <FailureBanner message={failure} />}

      {none ? (
        <div className="card empty">
          <h2 className="section">No accounts yet.</h2>
          <p>Create an account to start logging trades.</p>
          <button type="button" className="btn" onClick={() => setDialog({ account: null })}>New account</button>
        </div>
      ) : (
        <div className="card card-flush">
          <ReorderTable
            id="accounts"
            initialOrder={columnOrder}
            rowKeys={accounts.map((a) => a.id)}
            rowClasses={accounts.map((a) => (a.archived ? "muted-row" : undefined))}
            columns={[
              {
                key: "name", label: "Name",
                cells: accounts.map((a) => (
                  <>
                    <strong>{a.name}</strong>
                    {a.archived && <span className="tag tag-dashed">Archived</span>}
                  </>
                )),
              },
              { key: "currency", label: "Currency", cells: accounts.map((a) => a.currency) },
              { key: "kind", label: "Kind", cells: accounts.map((a) => (a.kind === "backtest" ? <span className="tag">Backtest</span> : "Live")) },
              { key: "start", label: "Trading-day start", cells: accounts.map((a) => a.tradingDayStart ?? "—") },
            ]}
            end={{
              label: "Actions",
              className: "actions",
              cells: accounts.map((a) =>
                a.archived ? (
                  <button type="button" className="btn" onClick={() => setArchived(a, false)} aria-label={`Restore ${a.name}`}>Restore</button>
                ) : (
                  <RowMenu
                    name={a.name}
                    items={[
                      { label: "Edit", onSelect: () => setDialog({ account: a }) },
                      { label: "Archive", onSelect: () => void setArchived(a, true) },
                    ]}
                  />
                ),
              ),
            }}
          />
          <div className="table-foot stack-md">
            {showArchived && <p className="helper">Archived accounts keep all their trades. Restore one to use it again.</p>}
            <p className="helper">Backtest accounts are marked in every account chooser and left out of live figures until you choose them.</p>
            <p className="helper">A trade entered at or after the start time counts to the next day. With no start time, a trade counts to the calendar date of its entry.</p>
          </div>
        </div>
      )}

      {pager}

      <AccountDialog open={dialog !== null} account={dialog?.account ?? null} currencies={currencies} onClose={close} />
    </>
  );
}
