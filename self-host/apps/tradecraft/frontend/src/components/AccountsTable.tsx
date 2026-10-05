"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { AccountDialog } from "@/components/AccountDialog";
import { FailureBanner, useToast } from "@/components/Notice";

export function AccountsView({ accounts, currencies, showArchived, openNew }: { accounts: Account[]; currencies: string[]; showArchived: boolean; openNew: boolean }) {
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
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Currency</th>
                  <th scope="col">Trading-day start</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className={a.archived ? "muted-row" : undefined}>
                    <td>
                      <strong>{a.name}</strong>
                      {a.archived && <span className="tag tag-dashed">Archived</span>}
                    </td>
                    <td>{a.currency}</td>
                    <td>{a.tradingDayStart ?? "—"}</td>
                    <td className="actions">
                      {a.archived ? (
                        <button type="button" className="btn" onClick={() => setArchived(a, false)} aria-label={`Restore ${a.name}`}>Restore</button>
                      ) : (
                        <>
                          <button type="button" className="btn-quiet" onClick={() => setDialog({ account: a })} aria-label={`Edit ${a.name}`}>Edit</button>
                          <button type="button" className="btn-quiet" onClick={() => setArchived(a, true)} aria-label={`Archive ${a.name}`}>Archive</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot stack-md">
            {showArchived && <p className="helper">Archived accounts keep all their trades. Restore one to use it again.</p>}
            <p className="helper">A trade that exits at or after the start time counts to the next day. With no start time, a trade counts to the calendar date of its exit.</p>
          </div>
        </div>
      )}

      <AccountDialog open={dialog !== null} account={dialog?.account ?? null} currencies={currencies} onClose={close} />
    </>
  );
}
