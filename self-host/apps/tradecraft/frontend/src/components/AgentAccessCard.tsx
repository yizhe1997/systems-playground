"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/browserApi";
import { dateTime } from "@/lib/format";
import type { AgentAccess, AgentToken } from "@/lib/types";
import { ConfirmItsYouDialog } from "@/components/ConfirmItsYouDialog";
import { NewTokenDialog } from "@/components/NewTokenDialog";

type Action = { kind: "switch"; enabled: boolean } | { kind: "revoke"; id: string; name: string } | { kind: "create"; name: string };

const PENDING = "tradecraft-pending-agent-action";
const WINDOW_MS = 10 * 60 * 1000;

/**
 * Screen B6: the one switch for agent access and the tokens (Settings, below Access). Turning it on or off, making a
 * token and revoking one need a Google confirmation within the last 10 minutes; when it is older "Confirm it's you"
 * comes first and the action is kept across the Google redirect and finished once on return (as the Access card does).
 * A failed confirmation drops the action; the Access card's own dialog says so.
 */
export function AgentAccessCard({ agent, zone, stepUpAt, stepUpFailed, mcpUrl }: { agent: AgentAccess; zone: string; stepUpAt: number; stepUpFailed: boolean; mcpUrl: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(stepUpFailed); // a failed confirmation says so here, on this page
  const [rowError, setRowError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ key: number; name: string; auto: boolean } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const seq = useRef(0);

  const fresh = () => stepUpAt > 0 && Date.now() - stepUpAt < WINDOW_MS;

  const ask = (a: Action) => {
    try {
      sessionStorage.setItem(PENDING, JSON.stringify(a));
    } catch {
      // the action is simply not remembered; the owner repeats it after confirming
    }
    setDialog(null);
    setConfirming(true);
  };

  const open = (name: string, auto: boolean) => setDialog({ key: ++seq.current, name, auto });

  const send = async (a: Exclude<Action, { kind: "create" }>): Promise<void> => {
    setBusy(true);
    setRowError(null);
    const r = a.kind === "switch"
      ? await call<AgentAccess>("PUT", "/agent", { enabled: a.enabled })
      : await call<AgentToken>("POST", `/agent/tokens/${encodeURIComponent(a.id)}/revoke`);
    setBusy(false);
    if (r.ok) return router.refresh();
    if (r.status === 403 && r.error.code === "step_up_required") return ask(a);
    setRowError(r.unreachable ? "Could not reach the journal. Nothing was changed." : r.error.message);
  };

  const run = (a: Exclude<Action, { kind: "create" }>) => {
    if (!fresh()) return ask(a);
    void send(a);
  };

  // coming back from Google: finish the one action that was waiting, once; a failed confirmation drops it
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PENDING);
      if (raw) sessionStorage.removeItem(PENDING);
    } catch {
      return;
    }
    if (!raw || stepUpFailed) return;
    try {
      const a = JSON.parse(raw) as Action;
      if (!fresh()) return;
      if (a.kind === "create") open(a.name, true);
      else void send(a);
    } catch {
      // damaged: ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = () => {
    setConfirming(false);
    try {
      sessionStorage.removeItem(PENDING);
    } catch {
      /* nothing to forget */
    }
    if (stepUpFailed) router.replace("/settings/integrations");
    opener.current?.focus();
  };

  const { enabled, tokens } = agent;

  return (
    <section className="card" aria-labelledby="agent-title">
      <div className="stack-md" style={{ maxWidth: 760 }}>
        <div>
          <h2 className="section" id="agent-title">Agent access</h2>
          <p className="helper">Lets an agent you choose read your journal. Everything it reads is written to the Audit log.</p>
        </div>

        <label className="switch">
          <input type="checkbox" checked={enabled} disabled={busy}
            onChange={(e) => { opener.current = e.currentTarget; run({ kind: "switch", enabled: e.target.checked }); }} />
          <span className="track" aria-hidden="true" />
          <span>{enabled ? "On" : "Off"}</span>
        </label>

        {!enabled && tokens.length === 0 && <p className="helper">Turn agent access on to create tokens.</p>}

        {enabled && tokens.length === 0 && (
          <div className="stack-md">
            <p><strong>No tokens yet.</strong></p>
            <p className="helper">A token is what you give your agent so it can read. You can revoke it at any time.</p>
            <div>
              <button type="button" className="btn" onClick={(e) => { opener.current = e.currentTarget; open("", false); }}>New token</button>
            </div>
          </div>
        )}

        {tokens.length > 0 && (
          <>
            {enabled && (
              <div>
                <button type="button" className="btn" onClick={(e) => { opener.current = e.currentTarget; open("", false); }}>New token</button>
              </div>
            )}
            {!enabled && <p className="helper">Turn agent access on to create tokens. Every token below is refused while it is off.</p>}
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last used</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{dateTime(t.createdAt, zone, true)}</td>
                    <td>{t.lastUsedAt ? dateTime(t.lastUsedAt, zone, true) : "Never used"}</td>
                    <td>{t.active ? "Active" : "Revoked"}</td>
                    <td>
                      {t.active && (
                        <button type="button" className="btn-quiet" disabled={busy}
                          onClick={(e) => { opener.current = e.currentTarget; run({ kind: "revoke", id: t.id, name: t.name }); }}>
                          Revoke<span className="sr-only"> {t.name}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {rowError && <p className="field-error" role="alert">! {rowError}</p>}
      </div>

      {dialog && (
        <NewTokenDialog
          key={dialog.key}
          initialName={dialog.name}
          auto={dialog.auto}
          mcpUrl={mcpUrl}
          isFresh={fresh}
          onNeedConfirm={(name) => ask({ kind: "create", name })}
          onClose={() => { setDialog(null); opener.current?.focus(); router.refresh(); }}
        />
      )}
      <ConfirmItsYouDialog open={confirming} failed={stepUpFailed} what="agent access" returnTo="/settings/integrations" onCancel={cancel} />
    </section>
  );
}
