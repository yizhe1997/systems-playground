"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Mistake } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { Dialog } from "@/components/Dialog";
import { RowMenu } from "@/components/RowMenu";
import { FailureBanner, Waiting, useNoticeableWait, useToast } from "@/components/Notice";

type Kind = "stop" | "rename" | "retire";

/** The per-mistake actions of S3: Stop line, Rename and Retire, each in its own dialog. */
export function MistakeActions({ mistake, actions }: { mistake: Mistake; actions: Kind[] }) {
  const [open, setOpen] = useState<Kind | null>(null);
  const label: Record<Kind, string> = { stop: "Stop line", rename: "Rename", retire: "Retire" };
  const close = () => setOpen(null);
  return (
    <>
      {actions.length > 1 ? (
        <RowMenu name={mistake.name} items={actions.map((k) => ({ label: label[k], onSelect: () => setOpen(k) }))} />
      ) : (
        actions.map((k) => (
          <button key={k} type="button" className="btn-quiet" onClick={() => setOpen(k)} aria-label={`${label[k]} ${mistake.name}`}>
            {label[k]}
          </button>
        ))
      )}
      <Dialog open={open === "stop"} onClose={close} title={`Stop line for ${mistake.name}`}>
        <StopLineForm mistake={mistake} onClose={close} />
      </Dialog>
      <Dialog open={open === "rename"} onClose={close} title="Rename mistake">
        <RenameForm mistake={mistake} onClose={close} />
      </Dialog>
      <Dialog open={open === "retire"} onClose={close} title={`Retire ${mistake.name}?`}>
        <RetireForm mistake={mistake} onClose={close} />
      </Dialog>
    </>
  );
}

/** Runs a save and turns the answer into the field messages, a failure banner or a stale-copy banner. */
function useSave(onClose: () => void) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const waiting = useNoticeableWait(saving);
  const run = async (go: () => ReturnType<typeof call>, after?: () => void) => {
    setSaving(true);
    setFailure(null);
    setConflict(null);
    setErrors({});
    const r = await go();
    setSaving(false);
    if (r.ok) {
      onClose();
      after?.();
      router.refresh();
      return;
    }
    if (r.unreachable) return setFailure("Could not reach the journal. Nothing was saved. What you typed is still here.");
    if (r.status === 409) return setConflict(r.error.message);
    if (r.status === 422) {
      const next: Record<string, string> = {};
      for (const f of r.error.fields ?? []) next[f.field] = f.message;
      return setErrors(next);
    }
    setFailure(r.error.message);
  };
  const banners = (
    <>
      {failure && <FailureBanner message={failure} />}
      {conflict && <FailureBanner message={conflict} retry={() => router.refresh()} retryLabel="Reload" />}
    </>
  );
  return { run, saving, waiting, errors, banners };
}

function StopLineForm({ mistake, onClose }: { mistake: Mistake; onClose: () => void }) {
  const [line, setLine] = useState(mistake.stopLine === null ? "" : String(mistake.stopLine));
  const [period, setPeriod] = useState<"week" | "month">(mistake.stopPeriod ?? "week");
  const { run, saving, waiting, errors, banners } = useSave(onClose);
  const send = (body: object) => run(() => call("PUT", `/mistakes/${mistake.id}`, { name: mistake.name, expectedUpdatedAt: mistake.updatedAt, ...body }));
  const typed = line.trim();
  return (
    <>
      <p className="helper">When the count reaches this number, {mistake.name} shows STOP TRADING. It is advice. It does not block you.</p>
      {banners}
      <div className="field">
        <label className="label" htmlFor="stop-line">Stop line</label>
        <input id="stop-line" className="field-input" inputMode="numeric" value={line} onChange={(e) => setLine(e.target.value)} aria-invalid={errors.stopLine ? true : undefined} aria-describedby={errors.stopLine ? "stop-line-err" : undefined} />
        {errors.stopLine && <p className="field-error" id="stop-line-err">! {errors.stopLine}</p>}
      </div>
      <div className="field">
        <label className="label" htmlFor="stop-period">Counted per</label>
        <select id="stop-period" className="field-input" value={period} onChange={(e) => setPeriod(e.target.value as "week" | "month")}>
          <option value="week">week</option>
          <option value="month">month</option>
        </select>
        {errors.stopPeriod && <p className="field-error">! {errors.stopPeriod}</p>}
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn"
          disabled={saving}
          // anything that is not a whole number is sent as 0, so the server's own message answers it
          onClick={() => send(typed === "" ? { stopLine: null, stopPeriod: null } : { stopLine: /^-?\d+$/.test(typed) ? Number(typed) : 0, stopPeriod: period })}
        >
          Save
        </button>
        <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
        {waiting && <Waiting label="Saving…" />}
        <span className="spacer" />
        {mistake.stopLine !== null && (
          <button type="button" className="btn-quiet" disabled={saving} onClick={() => send({ stopLine: null, stopPeriod: null })}>Remove the stop line</button>
        )}
      </div>
    </>
  );
}

function RenameForm({ mistake, onClose }: { mistake: Mistake; onClose: () => void }) {
  const [name, setName] = useState(mistake.name);
  const { run, saving, waiting, errors, banners } = useSave(onClose);
  return (
    <>
      {banners}
      <div className="field">
        <label className="label" htmlFor="mistake-name">Name</label>
        <input id="mistake-name" className="field-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "mistake-name-err" : undefined} />
        {errors.name && <p className="field-error" id="mistake-name-err">! {errors.name}</p>}
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => run(() => call("PUT", `/mistakes/${mistake.id}`, { name, stopLine: mistake.stopLine, stopPeriod: mistake.stopPeriod, expectedUpdatedAt: mistake.updatedAt }))}
        >
          Save
        </button>
        <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
        {waiting && <Waiting label="Saving…" />}
      </div>
    </>
  );
}

function RetireForm({ mistake, onClose }: { mistake: Mistake; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { run, saving, banners } = useSave(onClose);
  const undo = async () => {
    await call("POST", `/mistakes/${mistake.id}/restore`);
    router.refresh();
  };
  return (
    <>
      <p>It stops appearing in new tags. Past trades keep it, so history and counts stay correct.</p>
      {banners}
      <div className="form-actions">
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => run(() => call("POST", `/mistakes/${mistake.id}/retire`), () => toast({ text: "Mistake retired.", actionLabel: "Undo", onAction: undo }))}
        >
          Retire
        </button>
        <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

/** Add a mistake to the list. A name that matches a retired mistake brings that one back. */
export function AddMistake() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const router = useRouter();
  const add = async () => {
    setError(null);
    setFailure(null);
    const r = await call("POST", "/mistakes", { name });
    if (r.ok) {
      setName("");
      router.refresh();
      return;
    }
    if (r.unreachable) return setFailure("Could not reach the journal. Nothing was added.");
    if (r.status === 422) return setError(r.error.fields?.[0]?.message ?? r.error.message);
    setFailure(r.error.message);
  };
  return (
    <form className="field" onSubmit={(e) => { e.preventDefault(); void add(); }}>
      <label className="label" htmlFor="add-mistake">Add a mistake</label>
      <div className="bar-group">
        <input id="add-mistake" className="field-input" placeholder="Averaged down" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "add-mistake-err" : undefined} />
        <button type="submit" className="btn" disabled={name.trim() === ""}>Add</button>
      </div>
      {error && <p className="field-error" id="add-mistake-err">! {error}</p>}
      {failure && <FailureBanner message={failure} />}
    </form>
  );
}
