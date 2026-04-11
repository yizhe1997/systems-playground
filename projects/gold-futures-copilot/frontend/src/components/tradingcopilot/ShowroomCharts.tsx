'use client';

import { useEffect } from 'react';

type Props = {
  performance: Record<string, unknown>;
  activePreview?: Record<string, unknown> | null;
  latestClosedSummary?: Record<string, unknown> | null;
};

export function ShowroomCharts({ performance, activePreview, latestClosedSummary }: Props) {
  useEffect(() => {
    console.info('telemetry:showroom_rendered', {
      hasActivePreview: Boolean(activePreview),
      hasLatestClosed: Boolean(latestClosedSummary),
      ts: Date.now(),
    });
  }, [activePreview, latestClosedSummary]);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Performance</h3>
        <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto">{JSON.stringify(performance, null, 2)}</pre>
      </article>

      <article className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Active Preview (Masked)</h3>
        {activePreview ? (
          <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto">{JSON.stringify(activePreview, null, 2)}</pre>
        ) : (
          <p className="text-sm text-slate-600">No active setup currently.</p>
        )}
      </article>

      <article className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Latest Closed Summary</h3>
        {latestClosedSummary ? (
          <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto">{JSON.stringify(latestClosedSummary, null, 2)}</pre>
        ) : (
          <p className="text-sm text-slate-600">No closed setup summary yet.</p>
        )}
      </article>
    </section>
  );
}
