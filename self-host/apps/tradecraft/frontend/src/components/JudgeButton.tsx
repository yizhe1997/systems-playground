"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Judgement, Mistake, TradeImage, TradeImages } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { clock, dayLabel, money, plain, profitClass } from "@/lib/format";
import { Drawer } from "@/components/Drawer";
import { ImageViewer } from "@/components/ImageViewer";
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
  const button = useRef<HTMLButtonElement>(null);
  // the drawer is unmounted on close, so the browser cannot return focus to the button by itself
  const close = () => { setOpen(false); setTimeout(() => button.current?.focus(), 0); };
  return (
    <>
      <button ref={button} type="button" className="btn" onClick={() => setOpen(true)} aria-label={`Judge ${label}`}>Judge</button>
      {open && <JudgeDrawer tradeId={tradeId} accountName={accountName} zone={zone} onClose={close} />}
    </>
  );
}

function JudgeDrawer({ tradeId, accountName, zone, onClose }: { tradeId: string; accountName: string; zone: string; onClose: () => void }) {
  const router = useRouter();
  const [j, setJ] = useState<Judgement | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [plan, setPlan] = useState<Plan>(null);
  const [label, setLabel] = useState<Label>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const waiting = useNoticeableWait(saving);

  const [images, setImages] = useState<TradeImage[]>([]);
  const [maxNote, setMaxNote] = useState(200);
  const [viewing, setViewing] = useState<number | null>(null);
  // the pictures are extra: if they do not load, the judgement still works
  useEffect(() => {
    let live = true;
    void call<TradeImages>("GET", `/trades/${tradeId}/images`).then((r) => {
      if (live && r.ok) {
        setImages(r.data.items);
        setMaxNote(r.data.limits.maxNoteChars);
      }
    });
    return () => { live = false; };
  }, [tradeId]);

  const [tries, setTries] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([call<Judgement>("GET", `/trades/${tradeId}/judgement`), call<Mistake[]>("GET", "/mistakes?includeRetired=true")]).then(([r, m]) => {
      if (!live) return;
      if (!r.ok || !m.ok) return setLoadFailed(true);
      setJ(r.data);
      setPlan(r.data.planFollowed);
      setLabel(r.data.label);
      setTags(r.data.mistakeIds);
      setMistakes(m.data);
    });
    return () => { live = false; };
  }, [tradeId, tries]);

  const sameTags = j !== null && [...tags].sort().join() === [...j.mistakeIds].sort().join();
  const dirty = j !== null && (plan !== j.planFollowed || label !== j.label || !sameTags);
  // tags belong to a judgement labelled Mistake; a retired mistake is offered only where it is already tagged
  const offered = mistakes.filter((m) => !m.retired || j?.mistakeIds.includes(m.id));
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
    const r = await call<Judgement>("PUT", `/trades/${tradeId}/judgement`, { planFollowed: plan, label, mistakeIds: label === "mistake" ? tags : [], expectedUpdatedAt: j.updatedAt });
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
    ? `${t.instrument} ${t.direction === "long" ? "Long" : "Short"} x${plain(t.size)} · ${dayLabel(t.entryAt.slice(0, 10), false)} · ${clock(t.entryAt, zone)} to ${clock(t.exitAt, zone)} · ${accountName}`
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

          {images.length > 0 && (
            <section className="field" aria-label="Images">
              <span className="section">Images</span>
              <ul className="drawer-images">
                {images.map((img, n) => (
                  <li key={img.id}>
                    <button type="button" className="image-open" onClick={() => setViewing(n)} aria-label={`View ${img.name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a private same-origin picture */}
                      <img className="image-thumb" src={`/api/images/${img.id}`} alt={img.note || img.name} loading="lazy" />
                    </button>
                    {img.note && <span className="helper">{img.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {viewing !== null && <ImageViewer images={images} start={viewing} maxNote={maxNote} onChange={setImages} onClose={() => setViewing(null)} />}

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

          {label === "mistake" && (
            <fieldset className="field">
              <legend className="section">Which mistakes?</legend>
              <p className="helper">Pick every one that applies. Each counts once in the Mistakes counter.</p>
              <div className="judge-tags">
                {offered.map((m) => (
                  <label key={m.id} className="judge-option">
                    <input type="checkbox" checked={tags.includes(m.id)} onChange={(e) => setTags(e.target.checked ? [...tags, m.id] : tags.filter((x) => x !== m.id))} />
                    <span>{m.name}{m.retired && <span className="reason">Retired</span>}</span>
                  </label>
                ))}
              </div>
              {tags.length === 0 && <p className="helper">Nothing tagged yet. Labelled Mistake, not tagged: it adds nothing to the counter.</p>}
              {errors.mistakeIds && <p className="field-error">! {errors.mistakeIds}</p>}
            </fieldset>
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
