'use client';

import { useState } from 'react';

type Bias = 'long' | 'short' | 'neutral';

type TradePlanPayload = {
  instrument: 'GC';
  sessionDate: string;
  bias: Bias;
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
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof TradePlanPayload>(key: K, value: TradePlanPayload[K]) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      const res = await fetch('/api/proxy/creator/trade-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const data = await res.json();
      setSuccess(true);
      onCreated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  const biasOptions: Bias[] = ['long', 'short', 'neutral'];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Session Date */}
      <div className="space-y-2">
        <label className="kpi-label block">SESSION DATE</label>
        <input
          type="date"
          value={payload.sessionDate}
          onChange={(e) => update('sessionDate', e.target.value)}
        />
      </div>

      {/* Bias Selection */}
      <div className="space-y-2">
        <label className="kpi-label block">BIAS</label>
        <div className="flex gap-2">
          {biasOptions.map((bias) => (
            <button
              key={bias}
              type="button"
              onClick={() => update('bias', bias)}
              className={`bias-pill ${payload.bias === bias ? `active-${bias}` : ''}`}
            >
              {bias.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Zone */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="kpi-label block">ENTRY LOW</label>
          <input
            type="number"
            step="0.1"
            value={payload.entryLow || ''}
            onChange={(e) => update('entryLow', Number(e.target.value))}
            placeholder="2345.00"
          />
        </div>
        <div className="space-y-2">
          <label className="kpi-label block">ENTRY HIGH</label>
          <input
            type="number"
            step="0.1"
            value={payload.entryHigh || ''}
            onChange={(e) => update('entryHigh', Number(e.target.value))}
            placeholder="2348.50"
          />
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="kpi-label block text-short">STOP LOSS</label>
          <input
            type="number"
            step="0.1"
            value={payload.stopLoss || ''}
            onChange={(e) => update('stopLoss', Number(e.target.value))}
            placeholder="2340.00"
            className="border-short/30 focus:border-short"
          />
        </div>
        <div className="space-y-2">
          <label className="kpi-label block text-long">TAKE PROFIT</label>
          <input
            type="number"
            step="0.1"
            value={payload.takeProfit1 || ''}
            onChange={(e) => update('takeProfit1', Number(e.target.value))}
            placeholder="2365.00"
            className="border-long/30 focus:border-long"
          />
        </div>
      </div>

      {/* Invalidation Notes */}
      <div className="space-y-2">
        <label className="kpi-label block">INVALIDATION NOTES</label>
        <textarea
          value={payload.invalidationNotes}
          onChange={(e) => update('invalidationNotes', e.target.value)}
          placeholder="Conditions that would invalidate this setup..."
          rows={2}
        />
      </div>

      {/* Creator Notes */}
      <div className="space-y-2">
        <label className="kpi-label block">CREATOR NOTES</label>
        <textarea
          value={payload.creatorNotes}
          onChange={(e) => update('creatorNotes', e.target.value)}
          placeholder="Additional analysis or context..."
          rows={3}
        />
      </div>

      {/* Status Messages */}
      {error && (
        <p className="font-mono text-xs text-short tracking-wider">{error}</p>
      )}
      {success && (
        <p className="font-mono text-xs text-long tracking-wider">PLAN CREATED SUCCESSFULLY</p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? 'PUBLISHING...' : 'PUBLISH PLAN'}
      </button>
    </form>
  );
}
