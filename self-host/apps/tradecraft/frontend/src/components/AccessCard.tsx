"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/browserApi";
import { dateTime } from "@/lib/format";
import type { Identity } from "@/lib/types";
import { ConfirmItsYouDialog } from "@/components/ConfirmItsYouDialog";

type Filter = "all" | "active" | "disabled";
type Action = { kind: "add"; email: string } | { kind: "disable" | "enable"; id: string; email: string };

const PENDING = "tradecraft-pending-identity-action";
const WINDOW_MS = 10 * 60 * 1000;
const NOT_VALID = "Enter a valid email address, for example name@example.com.";

/**
 * Screen A2: who counts as the owner (Settings, Access). Adding, disabling and enabling need a Google confirmation
 * within the last 10 minutes: when it is older the "Confirm it's you" dialog (A3) comes first and the action is kept
 * across the Google redirect and finished once on return. Nothing is ever deleted.
 */
export function AccessCard({ identities, zone, stepUpAt, stepUpFailed }: { identities: Identity[]; zone: string; stepUpAt: number; stepUpFailed: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(stepUpFailed);
  const opener = useRef<HTMLElement | null>(null);

  const counts = {
    all: identities.length,
    active: identities.filter((i) => i.active).length,
    disabled: identities.filter((i) => !i.active).length,
  };
  const shown = identities.filter((i) => filter === "all" || (filter === "active" ? i.active : !i.active));

  const fresh = () => stepUpAt > 0 && Date.now() - stepUpAt < WINDOW_MS;

  const send = async (a: Action): Promise<void> => {
    setBusy(true);
    setError(null);
    setRowError(null);
    const r = a.kind === "add"
      ? await call<Identity>("POST", "/identities", { email: a.email })
      : await call<Identity>("POST", `/identities/${encodeURIComponent(a.id)}/${a.kind}`);
    setBusy(false);
    if (r.ok) {
      if (a.kind === "add") setEmail("");
      router.refresh();
      return;
    }
    if (r.status === 403 && r.error.code === "step_up_required") return ask(a);
    const msg = r.error.fields?.[0]?.message ?? r.error.message;
    if (a.kind === "add") setError(r.status === 422 ? r.error.fields?.[0]?.message ?? NOT_VALID : msg);
    else setRowError(msg);
  };

  const ask = (a: Action) => {
    try {
      sessionStorage.setItem(PENDING, JSON.stringify(a));
    } catch {
      // the action is simply not remembered; the owner repeats it after confirming
    }
    setConfirming(true);
  };

  const run = (a: Action) => {
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
      if (a.kind === "add") setEmail(a.email);
      if (fresh()) void send(a);
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
    if (stepUpFailed) router.replace("/settings/access");
    opener.current?.focus();
  };

  const chip = (f: Filter, label: string) => (
    <button key={f} type="button" className={`chip filter-chip${filter === f ? " chip-solid" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
      {label} {counts[f]}
    </button>
  );

  return (
    <section className="card" aria-labelledby="access-title">
      <div className="stack-md" style={{ maxWidth: 760 }}>
        <div>
          <h2 className="section" id="access-title">Access</h2>
          <p className="helper">Who can sign in. Every address here is you. Nothing is ever deleted; a disabled address can be enabled again.</p>
        </div>

        <div className="head-actions" role="group" aria-label="Show addresses">
          {chip("all", "All")}
          {chip("active", "Active")}
          {chip("disabled", "Disabled")}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Added</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id}>
                <td>{i.email}</td>
                <td>{dateTime(i.addedAt, zone, true)}</td>
                <td>{i.lastSignInAt ? dateTime(i.lastSignInAt, zone, true) : "—"}</td>
                <td>{i.active ? "Active" : "Disabled"}</td>
                <td>
                  <button type="button" className="btn-quiet" disabled={busy}
                    onClick={(e) => { opener.current = e.currentTarget; run({ kind: i.active ? "disable" : "enable", id: i.id, email: i.email }); }}>
                    {i.active ? "Disable" : "Enable"}
                    <span className="sr-only"> {i.email}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rowError && <p className="field-error" role="alert">! {rowError}</p>}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const a: Action = { kind: "add", email: email.trim() };
            opener.current = (e.currentTarget.querySelector("button[type=submit]") as HTMLElement) ?? null;
            if (!a.email) return setError(NOT_VALID);
            run(a);
          }}
        >
          <div className="field">
            <label className="label" htmlFor="access-email">Add an email</label>
            <div className="head-actions">
              <input id="access-email" type="email" className="field-input" placeholder="name@example.com" autoComplete="off" spellCheck={false}
                value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
                aria-invalid={error ? true : undefined} aria-describedby={error ? "access-email-err" : "access-email-help"} />
              <button type="submit" className="btn add-email" disabled={busy}>Add email</button>
            </div>
            {error && <p className="field-error" id="access-email-err">! {error}</p>}
            <p className="helper" id="access-email-help">Adding an address needs a recent sign-in.</p>
          </div>
        </form>
      </div>
      <ConfirmItsYouDialog open={confirming} failed={stepUpFailed} returnTo="/settings/access" onCancel={cancel} />
    </section>
  );
}
