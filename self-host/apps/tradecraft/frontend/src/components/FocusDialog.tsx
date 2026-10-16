"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Focus } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { monthName, weekRange } from "@/lib/format";
import { Dialog } from "@/components/Dialog";
import { FailureBanner, Waiting, useNoticeableWait, useToast } from "@/components/Notice";

type Period = "week" | "month";
const MAX = 280;

/**
 * The button of a focus card ("Write one" or "Edit") and the dialog it opens (screen S4). The focus is the owner's: one
 * for a week and one for a month, shown on every account's reviews. `date` is any day of the period.
 */
export function FocusButton({ date, period, written, only }: { date: string; period: Period; written: boolean; only?: Period }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); setTimeout(() => button.current?.focus(), 0); }; // the dialog is unmounted on close
  return (
    <>
      <button ref={button} type="button" className="btn-quiet" onClick={() => setOpen(true)} aria-label={`${written ? "Edit" : "Write"} the focus for the ${period}`}>
        {written ? "Edit" : "Write one"}
      </button>
      {open && <FocusDialog date={date} start={period} only={only} onClose={close} />}
    </>
  );
}

function FocusDialog({ date, start, only, onClose }: { date: string; start: Period; only?: Period; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Period>(start);
  const [loaded, setLoaded] = useState<Partial<Record<Period, Focus>>>({});
  const [text, setText] = useState<Record<Period, string>>({ week: "", month: "" });
  const [loadFailed, setLoadFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const waiting = useNoticeableWait(saving);

  useEffect(() => {
    let live = true;
    Promise.all((["week", "month"] as const).map((p) => call<Focus>("GET", `/focus?period=${p}&date=${date}`))).then(([w, m]) => {
      if (!live) return;
      if (!w.ok || !m.ok) return setLoadFailed(true);
      setLoaded({ week: w.data, month: m.data });
      setText({ week: w.data.body ?? "", month: m.data.body ?? "" });
    });
    return () => { live = false; };
  }, [date, tries]);

  const here = loaded[tab];
  const value = text[tab];
  const over = [...value].length - MAX; // characters, not UTF-16 units
  const dirty = (["week", "month"] as const).some((p) => loaded[p] && text[p] !== (loaded[p]?.body ?? ""));
  const label = here ? (tab === "week" ? `Focus for the week of ${weekRange(here.periodStart, here.periodEnd)}` : `Focus for ${monthName(here.periodStart.slice(0, 7))}`) : "Focus";

  const send = async (body: string, expected: string | null | undefined) => {
    setSaving(true);
    setFailure(null);
    setConflict(null);
    const r = await call<Focus>("PUT", "/focus", { period: tab, date, body, ...(expected ? { expectedUpdatedAt: expected } : {}) });
    setSaving(false);
    return r;
  };
  const fail = (r: Awaited<ReturnType<typeof send>>) => {
    if (r.ok) return false;
    if (r.unreachable) setFailure("Could not reach the journal. Nothing was saved. What you typed is still here.");
    else if (r.status === 409) setConflict(r.error.message);
    else setFailure(r.error.fields?.[0]?.message ?? r.error.message);
    return true;
  };

  const save = async () => {
    const r = await send(value, here?.updatedAt);
    if (fail(r)) return;
    onClose();
    router.refresh();
  };
  const clear = async () => {
    const old = here?.body ?? "";
    const r = await send("", here?.updatedAt);
    if (fail(r)) return;
    onClose();
    toast({
      text: "Focus cleared.",
      actionLabel: "Undo",
      onAction: async () => {
        await call("PUT", "/focus", { period: tab, date, body: old });
        router.refresh();
      },
    });
    router.refresh();
  };
  const requestClose = () => (dirty ? setAsking(true) : onClose());

  return (
    <Dialog open onClose={requestClose} title="Write a focus">
      {asking && (
        <div className="banner" role="alertdialog" aria-label="Leave without saving?">
          <div>
            <div className="banner-title">Leave without saving?</div>
            <div className="helper">Your changes will be lost.</div>
          </div>
          <span className="spacer" />
          <button type="button" className="btn" onClick={() => setAsking(false)} autoFocus>Keep editing</button>
          <button type="button" className="btn-quiet" onClick={onClose}>Leave</button>
        </div>
      )}
      {loadFailed && <FailureBanner message="Could not reach the journal." retry={() => { setLoadFailed(false); setTries((n) => n + 1); }} />}
      {failure && <FailureBanner message={failure} retry={save} />}
      {conflict && <FailureBanner message={conflict} retry={() => { setConflict(null); setTries((n) => n + 1); }} retryLabel="Reload" />}
      {!only && (
        <div className="pills" role="tablist" aria-label="Period">
          {(["week", "month"] as const).map((p) => (
            <button key={p} type="button" role="tab" className="pill" aria-selected={tab === p} aria-current={tab === p ? "true" : undefined} onClick={() => setTab(p)}>
              {p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      )}
      {here && (
        <div className="field">
          <label className="label" htmlFor="focus-text">{label}</label>
          <textarea
            id="focus-text"
            className="field-input"
            value={value}
            placeholder="One sentence you want to see every day this week."
            onChange={(e) => setText({ ...text, [tab]: e.target.value })}
            aria-invalid={over > 0 ? true : undefined}
            aria-describedby="focus-count"
          />
          <p className="helper" id="focus-count">{[...value].length} of {MAX} characters · Up to {MAX} characters.</p>
          {over > 0 && <p className="field-error">! {over === 1 ? "Too long: 1 character over. Shorten it to save." : `Too long: ${over} characters over. Shorten it to save.`}</p>}
          <p className="helper">Shown at the top of every daily review this {tab}, on all your accounts.</p>
        </div>
      )}
      <div className="form-actions">
        <button type="button" className={`btn${over > 0 ? " btn-off" : ""}`} disabled={saving || !here || over > 0} onClick={save}>Save focus</button>
        <button type="button" className="btn-quiet" onClick={requestClose}>Cancel</button>
        {waiting && <Waiting label="Saving…" />}
        <span className="spacer" />
        {here?.body && <button type="button" className="btn-quiet" disabled={saving} onClick={clear}>Clear this focus</button>}
      </div>
    </Dialog>
  );
}
