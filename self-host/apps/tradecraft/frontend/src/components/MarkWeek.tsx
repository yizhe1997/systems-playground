"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WeeklyReview } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { dateTime } from "@/lib/format";
import { FailureBanner, Waiting, useNoticeableWait } from "@/components/Notice";

/** Mark as reviewed: the one thing a weekly review stores (that it was marked, and when). */
export function MarkWeek({ week, zone }: { week: WeeklyReview; zone: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const waiting = useNoticeableWait(saving);
  const notStarted = week.weekStart > week.today;
  const mark = async () => {
    setSaving(true);
    setFailure(null);
    const r = await call("POST", "/weekly/mark", { accountId: week.accountId, date: week.weekStart });
    setSaving(false);
    if (r.ok) return router.refresh();
    setFailure(r.unreachable ? "Could not reach the journal. Nothing was saved." : (r.error.fields?.[0]?.message ?? r.error.message));
  };
  return (
    <section className="card section-card" aria-label="Mark the week reviewed">
      {failure && <FailureBanner message={failure} retry={mark} />}
      <div className="form-actions">
        {week.state === "reviewed" && week.reviewedAt ? (
          <strong>Reviewed {dateTime(week.reviewedAt, zone)}</strong>
        ) : (
          <button type="button" className="btn" disabled={saving || notStarted} onClick={mark}>Mark as reviewed</button>
        )}
        {waiting && <Waiting label="Saving…" />}
        <span className="helper">Weekly reviews save only this mark and its time. The focus is saved from its own dialog.</span>
      </div>
      {notStarted && <p className="field-error" style={{ marginTop: 8 }}>! This week has not started yet. Mark as reviewed is unavailable.</p>}
    </section>
  );
}
