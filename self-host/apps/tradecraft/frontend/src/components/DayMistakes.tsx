"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyReview, Mistake } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { FailureBanner } from "@/components/Notice";

/** Mistakes recorded once for the whole day (not tied to one trade). Each change is saved at once, apart from the review. */
export function DayMistakes({ review, mistakes }: { review: DailyReview; mistakes: Mistake[] }) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const recorded = review.dayMistakes.map((m) => m.mistakeId);
  const save = async (ids: string[]) => {
    setFailure(null);
    const r = await call("PUT", "/reviews/day-mistakes", { accountId: review.accountId, date: review.date, mistakeIds: ids });
    if (r.ok) {
      setPick("");
      router.refresh();
      return;
    }
    setFailure(r.unreachable ? "Could not reach the journal. Nothing was changed." : r.error.message);
  };
  const available = mistakes.filter((m) => !recorded.includes(m.id));
  return (
    <section className="card section-card" aria-labelledby="day-mistakes-title">
      <div className="section-head">
        <h2 className="section" id="day-mistakes-title">Mistakes for the whole day</h2>
        <span className="helper">Not tied to one trade (for example revenge mode). Each is recorded once for the day.</span>
      </div>
      {failure && <FailureBanner message={failure} />}
      <div className="day-records">
        {review.dayMistakes.length === 0 && <span className="helper">None recorded.</span>}
        {review.dayMistakes.map((m) => (
          <span key={m.mistakeId} className="chip">
            {m.name}
            <button type="button" className="btn-quiet" aria-label={`Remove ${m.name}`} onClick={() => save(recorded.filter((x) => x !== m.mistakeId))}>×</button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <div className="bar-group">
          <label className="sr-only" htmlFor="day-mistake-pick">Mistake for the whole day</label>
          <select id="day-mistake-pick" className="field-input" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a mistake</option>
            {available.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button type="button" className="btn" disabled={pick === ""} onClick={() => save([...recorded, pick])}>+ Add a mistake</button>
        </div>
      )}
    </section>
  );
}
