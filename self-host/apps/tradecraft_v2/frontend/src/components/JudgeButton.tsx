"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Judgement } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { clock, dayLabel, money, plain, profitClass } from "@/lib/format";
import { Drawer } from "@/components/Drawer";
import { FailureBanner, Waiting, useNoticeableWait } from "@/components/Notice";

type Plan = "yes" | "partly" | "no" | null;
type Label = "valid_loss" | "mistake" | null;

// the same words as backend/internal/api/wording.go
const NOT_FOLLOWED = "Not available: you answered that the plan was not followed.";
const NOT_A_LOSS = "Not available: this trade is not a loss.";

const PLAN_WORD: Record<string, string> = { yes: "Followed", partly: "Partly followed", no: "Not followed" };

const sentence = (reason: string) => (reason === "no stop recorded" ? "No stop recorded, so no risk figure." : reason.charAt(0).toUpperCase() + reason.slice(1) + ".");

/** The Judge button of a trade in the daily review, and the drawer it opens (screen S2). */
export function JudgeButton({ tradeId, label, accountName, zone }: { tradeId: string; label: string; accountName: string; zone: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)} aria-label={`Judge ${label}`}>Judge</button>
      {open && <JudgeDrawer tradeId={tradeId} accountName={accountName} zone={zone} onClose={() => setOpen(false)} />}
    </>
  );
}

function JudgeDrawer({ tradeId, accountName, zone, onClose }: { tradeId: string; accountName: string; zone: string; onClose: () => void }) {
  const router = useRouter();
  const [j, setJ] = useState<Judgement | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [plan, setPlan] = useState<Plan>(null);
  const [label, setLabel] = useState<Label>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const waiting = useNoticeableWait(saving);

  const [tries, setTries] = useState(0);
  useEffect(() => {
    let live = true;
    call<Judgement>("GET", `/trades/${tradeId}/judgement`).then((r) => {
      if (!live) return;
      if (!r.ok) return setLoadFailed(true);
      setJ(r.data);
      setPlan(r.data.planFollowed);
      setLabel(r.data.label);
    });
    return () => { live = false; };
  }, [tradeId, tries]);

  const dirty = j !== null && (plan !== j.planFollowed || label !== j.label);
  const validLossReason = j === null ? null : !j.isLoss ? NOT_A_LOSS : plan !== "yes" ? NOT_FOLLOWED : null;

  const choosePlan = (p: Plan) => {
    setPlan(p);
    if (p !== "yes" && label === "valid_loss") setLabel(null); // the valid-loss label cannot stand without a Yes
  };

  const save = async () => {
    if (!j) return;
    setSaving(true);
    setFailure(null);
    setConflict(null);
    setErrors({});
    const r = await call<Judgement>("PUT", `/trades/${tradeId}/judgement`, { planFollowed: plan, label, mistakeIds: j.mistakeIds, expectedUpdatedAt: j.updatedAt });
    setSaving(false);
    if (r.ok) {
      onClose();
      router.refresh();
      return;
    }
    if (r.unreachable) return setFailure("Could not reach the journal. Nothing was saved. What you chose is still here.");
    if (r.status === 409) return setConflict(r.error.message);
    if (r.status === 422) {
      const next: Record<string, string> = {};
      for (const f of r.error.fields ?? []) next[f.field] = f.message;
      return setErrors(next);
    }
    setFailure(r.error.message);
  };

  const t = j?.trade;
  const title = t
    ? `${t.instrument} ${t.direction === "long" ? "Long" : "Short"} x${plain(t.size)} · ${dayLabel(t.exitAt.slice(0, 10), false)} · ${clock(t.entryAt, zone)} to ${clock(t.exitAt, zone)} · ${accountName}`
    : "Judge a trade";

  return (
    <Drawer open onClose={onClose} title={title} dirty={dirty}>
      {loadFailed && <FailureBanner message="Could not reach the journal." retry={() => { setLoadFailed(false); setTries((n) => n + 1); }} />}
      {failure && <FailureBanner message={failure} retry={save} />}
      {conflict && <FailureBanner message={conflict} retry={() => router.refresh()} retryLabel="Reload" />}
      {j && t && (
        <>
          <div className="judge-strip" role="group" aria-label="Result">
            <div><span className="label">Result</span><div className={`stat-value ${profitClass(t.netResult)}`}>{t.netResult !== null ? money(t.netResult, t.currency, true) : "—"}</div></div>
            <div>
              <span className="label">Risk</span>
              <div className="stat-value">{t.risk !== null ? money(t.risk, t.currency) : "—"}</div>
              {t.risk === null && <span className="helper">{sentence(t.reasons.risk ?? "no risk figure")}</span>}
            </div>
            <div><span className="label">Plan</span><div className="stat-value">{plan ? PLAN_WORD[plan] : "Not answered yet"}</div></div>
          </div>

          <fieldset className="field">
            <legend className="section">Did you follow your plan?</legend>
            <div className="segment" role="radiogroup" aria-label="Did you follow your plan?" aria-invalid={errors.planFollowed ? true : undefined}>
              {([["yes", "Yes"], ["partly", "Partly"], ["no", "No"]] as const).map(([v, text]) => (
                <label key={v}>
                  <input type="radio" name="plan" value={v} checked={plan === v} onChange={() => choosePlan(v)} />
                  <span>{text}</span>
                </label>
              ))}
            </div>
            {errors.planFollowed && <p className="field-error">! {errors.planFollowed}</p>}
          </fieldset>

          {j.isLoss ? (
            <fieldset className="field">
              <legend className="section">What was this decision?</legend>
              <p className="helper">Only for losing trades.</p>
              <div className="judge-options">
                <label className={`judge-option${validLossReason ? " judge-option-off" : ""}`}>
                  <input type="radio" name="decision" value="valid_loss" checked={label === "valid_loss"} disabled={validLossReason !== null} onChange={() => setLabel("valid_loss")} />
                  <span><strong>Valid loss</strong>: I followed my rules. No change needed.{validLossReason && <span className="reason">{validLossReason}</span>}</span>
                </label>
                <label className="judge-option">
                  <input type="radio" name="decision" value="mistake" checked={label === "mistake"} onChange={() => setLabel("mistake")} />
                  <span><strong>Mistake</strong>: I broke my rules. Tag what I did wrong below.</span>
                </label>
              </div>
              {label !== null && <button type="button" className="btn-quiet" style={{ alignSelf: "flex-start" }} onClick={() => setLabel(null)}>Clear the decision</button>}
              {errors.label && <p className="field-error">! {errors.label}</p>}
            </fieldset>
          ) : (
            <label className="judge-option">
              <input type="checkbox" checked={label === "mistake"} onChange={(e) => setLabel(e.target.checked ? "mistake" : null)} />
              <span>
                <strong>{j.isWin ? "This win was a mistake" : "This trade was a mistake"}</strong>
                <span className="reason">It {j.isWin ? "made money" : "broke even"}, but I was off plan. It will show as {j.isWin ? "a profitable mistake, not a clean win" : "a mistake"}.</span>
              </span>
            </label>
          )}

          <div className="field">
            <span className="section">Why I took it (thesis)</span>
            <p>{t.thesis ? t.thesis : <span className="helper">No thesis written.</span>}</p>
            <p className="helper">Written when you logged the trade. Shown here to read, not edit.</p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn" disabled={saving} onClick={save}>Save</button>
            <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
            {waiting && <Waiting label="Saving…" />}
            <span className="spacer" />
            <a className="btn-quiet" href={`/trades/${tradeId}/edit`}>Edit trade in the trade form.</a>
          </div>
        </>
      )}
      {!j && !loadFailed && <p className="helper" role="status">Loading…</p>}
    </Drawer>
  );
}
