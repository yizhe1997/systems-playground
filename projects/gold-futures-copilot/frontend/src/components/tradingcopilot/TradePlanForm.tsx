'use client';

import { useState } from 'react';

type TradePlanPayload = {
  instrument: 'GC';
  sessionDate: string;
  bias: 'long' | 'short' | 'neutral';
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfit1: number;
  invalidationNotes?: string;
  creatorNotes?: string;
};

export function TradePlanForm({ onCreated }: { onCreated?: (data: unknown) => void }) {
  const [payload, setPayload] = useState<TradePlanPayload>({
    instrument: 'GC',
    sessionDate: new Date().toISOString().slice(0, 10),
    bias: 'long',
    entryLow: 0,
    entryHigh: 0,
    stopLoss: 0,
    takeProfit1: 0,
    invalidationNotes: '',
    creatorNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof TradePlanPayload>(key: K, value: TradePlanPayload[K]) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/creator/trade-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`create failed: ${res.status}`);
      const data = await res.json();
      onCreated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">Create Trade Plan</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <input className="border rounded px-3 py-2" value={payload.sessionDate} onChange={(e) => update('sessionDate', e.target.value)} type="date" />
        <select className="border rounded px-3 py-2" value={payload.bias} onChange={(e) => update('bias', e.target.value as TradePlanPayload['bias'])}>
          <option value="long">Long</option>
          <option value="short">Short</option>
          <option value="neutral">Neutral</option>
        </select>
        <input className="border rounded px-3 py-2" type="number" step="0.1" placeholder="Entry Low" value={payload.entryLow} onChange={(e) => update('entryLow', Number(e.target.value))} />
        <input className="border rounded px-3 py-2" type="number" step="0.1" placeholder="Entry High" value={payload.entryHigh} onChange={(e) => update('entryHigh', Number(e.target.value))} />
        <input className="border rounded px-3 py-2" type="number" step="0.1" placeholder="Stop Loss" value={payload.stopLoss} onChange={(e) => update('stopLoss', Number(e.target.value))} />
        <input className="border rounded px-3 py-2" type="number" step="0.1" placeholder="Take Profit 1" value={payload.takeProfit1} onChange={(e) => update('takeProfit1', Number(e.target.value))} />
      </div>
      <textarea className="border rounded px-3 py-2 w-full" placeholder="Invalidation notes" value={payload.invalidationNotes} onChange={(e) => update('invalidationNotes', e.target.value)} />
      <textarea className="border rounded px-3 py-2 w-full" placeholder="Creator notes" value={payload.creatorNotes} onChange={(e) => update('creatorNotes', e.target.value)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button disabled={submitting} className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-60" type="submit">
        {submitting ? 'Creating…' : 'Create Plan'}
      </button>
    </form>
  );
}
