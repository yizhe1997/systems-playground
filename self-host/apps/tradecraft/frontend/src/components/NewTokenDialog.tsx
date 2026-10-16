"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/browserApi";
import type { AgentToken } from "@/lib/types";
import { Dialog } from "@/components/Dialog";
import { FailureBanner, Waiting, useNoticeableWait } from "@/components/Notice";

type Created = { token: AgentToken; value: string };

/**
 * Screen B7. Name a token, create it, and see its value once. The value lives only in this component's state: it is
 * not in the address, not in storage and not in any list, and it is gone when the dialog is. The parent mounts this
 * only while it is open (so every open starts empty).
 *
 * Creating a token needs a Google confirmation within the last 10 minutes: when there is none, `onNeedConfirm` hands
 * the typed name back and the parent asks first; after the confirmation the parent mounts this again with `auto` and
 * the name, and the token is made once.
 */
export function NewTokenDialog({
  initialName = "", auto = false, mcpUrl, isFresh, onNeedConfirm, onClose,
}: {
  initialName?: string;
  auto?: boolean;
  mcpUrl: string;
  isFresh: () => boolean;
  onNeedConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const waiting = useNoticeableWait(busy);
  const started = useRef(false);

  const create = async (typed: string) => {
    const n = typed.trim();
    if (!n) return setError("Name is required.");
    if (!isFresh()) return onNeedConfirm(n);
    setBusy(true);
    setError(null);
    setFailure(null);
    const r = await call<Created>("POST", "/agent/tokens", { name: n });
    setBusy(false);
    if (r.ok) {
      setCreated(r.data);
      router.refresh(); // the list behind the dialog shows the new token; the value stays here
      return;
    }
    if (r.unreachable) return setFailure("Could not reach the journal. No token was made. What you typed is still here.");
    if (r.status === 403 && r.error.code === "step_up_required") return onNeedConfirm(n);
    if (r.status === 409 || r.status === 422) return setError(r.error.fields?.[0]?.message ?? r.error.message);
    setFailure(r.error.message);
  };

  // coming back from Google with the name that was waiting: make the token once
  useEffect(() => {
    if (auto && !started.current && initialName.trim()) {
      started.current = true;
      void create(initialName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null); // every block is selectable, so the owner can copy it by hand
    }
  };

  if (created) {
    // ready to paste, with the address and the value in place (the value is in these blocks only as long as the dialog is)
    const command = `claude mcp add --transport http tradecraft ${mcpUrl} --header "Authorization: Bearer ${created.value}"`;
    const desktop = JSON.stringify(
      {
        mcpServers: {
          tradecraft: {
            command: "npx",
            args: ["-y", "mcp-remote", mcpUrl, "--allow-http", "--header", "Authorization:${AUTH_HEADER}"],
            env: { AUTH_HEADER: `Bearer ${created.value}` },
          },
        },
      },
      null,
      2,
    );
    const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 12 } as const;
    return (
      // Escape and the backdrop do not close it: the value cannot be shown again, only Done ends it
      <Dialog open onClose={() => undefined} title="Token created">
        <p>Copy this token now and paste it into your agent&apos;s settings. It cannot be shown again.</p>
        <div className="field">
          <label className="label" htmlFor="token-value">{created.token.name}</label>
          <input id="token-value" className="field-input" readOnly value={created.value} spellCheck={false} autoComplete="off"
            style={mono} onFocus={(e) => e.currentTarget.select()} />
          <p className="helper">If you lose it, revoke this token and make a new one.</p>
        </div>
        <div className="field">
          <label className="label" htmlFor="token-command">Claude Code: paste this in a terminal</label>
          <textarea id="token-command" className="field-input" readOnly rows={3} value={command} spellCheck={false}
            style={{ ...mono, height: "auto", padding: 8, resize: "none" }} onFocus={(e) => e.currentTarget.select()} />
          <div><button type="button" className="btn-quiet" onClick={() => void copy("command", command)}>Copy command</button></div>
        </div>
        <div className="field">
          <label className="label" htmlFor="token-desktop">Claude Desktop: add this to claude_desktop_config.json, then restart it</label>
          <textarea id="token-desktop" className="field-input" readOnly rows={8} value={desktop} spellCheck={false}
            style={{ ...mono, height: "auto", padding: 8, resize: "none" }} onFocus={(e) => e.currentTarget.select()} />
          <p className="helper">Claude Desktop reaches a program on this computer through a small bridge (mcp-remote, run by npx, so Node.js must be installed).</p>
          <div><button type="button" className="btn-quiet" onClick={() => void copy("desktop", desktop)}>Copy settings</button></div>
        </div>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn" onClick={() => void copy("token", created.value)}>Copy token</button>
          <button type="button" className="btn-quiet" autoFocus onClick={onClose}>Done</button>
          <span role="status" className="helper">{copied ? "Copied" : ""}</span>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title="New token">
      <form
        className="stack"
        style={{ marginTop: 0 }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void create(name);
        }}
      >
        {failure && <FailureBanner message={failure} retry={() => void create(name)} />}
        <div className="field">
          <label className="label" htmlFor="token-name">Name</label>
          <input id="token-name" className="field-input" placeholder="e.g. Claude Desktop, backtests" value={name} autoComplete="off" autoFocus
            onChange={(e) => { setName(e.target.value); setError(null); }}
            aria-invalid={error ? true : undefined} aria-describedby={error ? "token-name-err" : "token-name-help"} />
          {error && <p className="field-error" id="token-name-err">! {error}</p>}
          <p className="helper" id="token-name-help">Choose a name you will recognise. It is shown in the Audit log next to everything this token reads.</p>
        </div>
        <p className="helper">This token can read your journal.</p>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="submit" className="btn" disabled={busy}>Create token</button>
          <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
          {waiting && <Waiting label="Creating…" />}
        </div>
      </form>
    </Dialog>
  );
}
