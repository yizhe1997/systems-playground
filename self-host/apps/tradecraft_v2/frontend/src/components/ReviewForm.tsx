"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyReview } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { dateTime } from "@/lib/format";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
import { FailureBanner, Waiting, useNoticeableWait } from "@/components/Notice";
import { Stars } from "@/components/Stars";

type Values = { didWell: string; couldImprove: string; nextFocus: string; mentalGrade: number | null; technicalGrade: number | null };

/** The three questions, the two grades, Save draft and Mark as reviewed. The page remounts it after every save. */
export function ReviewForm({ review, zone }: { review: DailyReview; zone: string }) {
  const router = useRouter();
  const initial: Values = { ...review.answers, mentalGrade: review.mentalGrade, technicalGrade: review.technicalGrade };
  const [v, setV] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const waiting = useNoticeableWait(saving);
  const dirty = !saved && JSON.stringify(v) !== JSON.stringify(initial);
  const { prompt } = useUnsavedGuard(dirty);
  const notYet = review.date > review.today;

  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((p) => ({ ...p, [k]: value }));

  const save = async (markReviewed: boolean) => {
    setSaving(true);
    setFailure(null);
    setConflict(null);
    setErrors({});
    const r = await call<DailyReview>("PUT", "/reviews/day", {
      accountId: review.accountId,
      date: review.date,
      ...v,
      markReviewed,
      expectedUpdatedAt: review.updatedAt,
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
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

  const q = (field: "didWell" | "couldImprove" | "nextFocus", label: string, help?: string) => (
    <div className="field q">
      <label className="label" htmlFor={`q-${field}`}>{label}</label>
      <textarea
        id={`q-${field}`}
        className="field-input"
        value={v[field]}
        onChange={(e) => set(field, e.target.value)}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `q-${field}-err` : undefined}
      />
      {errors[field] && <p className="field-error" id={`q-${field}-err`}>! {errors[field]}</p>}
      {help && <p className="helper">{help}</p>}
    </div>
  );

  return (
    <>
      {failure && <FailureBanner message={failure} retry={() => save(false)} />}
      {conflict && <FailureBanner message={conflict} retry={() => router.refresh()} retryLabel="Reload" />}

      <section className="card section-card" aria-labelledby="review-title">
        <h2 className="section" id="review-title">Your review</h2>
        {q("didWell", "What did I do well today?")}
        {q("couldImprove", "What could I improve on?")}
        {q("nextFocus", "What will I focus on next session?", `Your answer to the last question is shown at the top of your next review for ${review.accountName}.`)}
      </section>

      <section className="card section-card" aria-labelledby="grades-title">
        <div className="section-head">
          <h2 className="section" id="grades-title">Process grades for the day</h2>
          <span className="helper">Grade the decisions, not the result.</span>
        </div>
        <div className="grades">
          <Stars label="Mental" name="mental" value={v.mentalGrade} onChange={(g) => set("mentalGrade", g)} />
          <Stars label="Technical" name="technical" value={v.technicalGrade} onChange={(g) => set("technicalGrade", g)} />
        </div>
        <p className="helper" style={{ marginTop: 8 }}>1: drifted from the plan. 5: followed it fully.</p>
        {(errors.mentalGrade || errors.technicalGrade) && <p className="field-error">! {errors.mentalGrade ?? errors.technicalGrade}</p>}
      </section>

      <div className="form-actions">
        <button type="button" className="btn" disabled={saving || notYet} onClick={() => save(true)}>Mark as reviewed</button>
        <button type="button" className="btn" disabled={saving} onClick={() => save(false)}>Save draft</button>
        {waiting && <Waiting label="Saving…" />}
        {review.updatedAt && !waiting && <span className="helper">Last saved {dateTime(review.updatedAt, zone)}</span>}
      </div>
      {(notYet || errors.markReviewed) && (
        <p className="field-error" style={{ marginTop: 8 }}>! {errors.markReviewed ?? "This day has not happened yet."} Mark as reviewed is unavailable.</p>
      )}
      {prompt}
    </>
  );
}
