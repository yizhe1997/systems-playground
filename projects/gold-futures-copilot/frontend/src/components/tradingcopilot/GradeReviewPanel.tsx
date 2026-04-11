'use client';

import { useState } from 'react';

export function GradeReviewPanel({ tradePlanId }: { tradePlanId: string }) {
  const [selectedId, setSelectedId] = useState(tradePlanId);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runGrade() {
    if (!selectedId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/creator/grade?id=${selectedId}`, { method: 'POST' });
      if (!res.ok) throw new Error(`grade failed: ${res.status}`);
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <input
        className="border rounded px-3 py-2 w-full"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        placeholder="Trade Plan ID"
      />
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Grade & Review</h3>
        <button className="rounded border px-3 py-1 text-sm" onClick={runGrade} disabled={loading}>
          {loading ? 'Grading…' : 'Run Grade'}
        </button>
      </div>
      {result ? <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre> : <p className="text-sm text-slate-600">No grading result yet.</p>}
    </section>
  );
}
