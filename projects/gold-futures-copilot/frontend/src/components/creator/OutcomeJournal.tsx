'use client';

import { useState, useMemo } from 'react';

export function OutcomeJournal() {
  const [tradePlanId, setTradePlanId] = useState('');
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [exitPrice, setExitPrice] = useState<number | ''>('');
  const [positionSize, setPositionSize] = useState<number>(1);
  const [creatorNotes, setCreatorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate estimated P&L
  const estimatedPL = useMemo(() => {
    if (entryPrice === '' || exitPrice === '' || !positionSize) return null;
    
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const size = Number(positionSize);
    
    // GC futures: $100 per 1 point, $10 per tick (0.1)
    const pointDiff = exit - entry;
    const pnl = pointDiff * 100 * size;
    
    return pnl;
  }, [entryPrice, exitPrice, positionSize]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!tradePlanId) {
      setResponse({ type: 'error', message: 'TRADE PLAN ID IS REQUIRED' });
      return;
    }

    setSubmitting(true);
    setResponse(null);

    const payload = {
      entryPrice: Number(entryPrice),
      exitPrice: Number(exitPrice),
      positionSize,
      creatorNotes,
      closedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/proxy/creator/outcome?id=${tradePlanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setResponse({ type: 'success', message: 'OUTCOME LOGGED SUCCESSFULLY' });
        // Reset form
        setTradePlanId('');
        setEntryPrice('');
        setExitPrice('');
        setPositionSize(1);
        setCreatorNotes('');
      } else {
        const text = await res.text();
        setResponse({ type: 'error', message: `ERROR: ${res.status} - ${text}` });
      }
    } catch (err) {
      setResponse({ type: 'error', message: err instanceof Error ? err.message : 'UNEXPECTED ERROR' });
    } finally {
      setSubmitting(false);
    }
  }

  const formatPL = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Trade Plan ID */}
      <div className="space-y-2">
        <label className="kpi-label block">PLAN ID</label>
        <div className="relative">
          <input
            type="text"
            value={tradePlanId}
            onChange={(e) => setTradePlanId(e.target.value)}
            placeholder="Enter trade plan ID..."
          />
        </div>
      </div>

      {/* Entry Price */}
      <div className="space-y-2">
        <label className="kpi-label block">ENTRY PRICE</label>
        <input
          type="number"
          step="0.1"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : '')}
          placeholder="2346.50"
        />
      </div>

      {/* Exit Price */}
      <div className="space-y-2">
        <label className="kpi-label block">EXIT PRICE</label>
        <input
          type="number"
          step="0.1"
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value ? Number(e.target.value) : '')}
          placeholder="2363.00"
        />
      </div>

      {/* Position Size */}
      <div className="space-y-2">
        <label className="kpi-label block">POSITION SIZE</label>
        <input
          type="number"
          step="1"
          min="1"
          value={positionSize}
          onChange={(e) => setPositionSize(Number(e.target.value))}
          placeholder="1"
        />
      </div>

      {/* Live P&L Preview */}
      {estimatedPL !== null && (
        <div className="hud-frame p-4">
          <p className="kpi-label mb-2">P/L ESTIMATE</p>
          <p className={`font-mono text-4xl ${estimatedPL >= 0 ? 'text-long' : 'text-short'}`}>
            {formatPL(estimatedPL)}
          </p>
        </div>
      )}

      {/* Creator Notes */}
      <div className="space-y-2">
        <label className="kpi-label block">CREATOR NOTES</label>
        <textarea
          value={creatorNotes}
          onChange={(e) => setCreatorNotes(e.target.value)}
          placeholder="Reflection on trade execution, lessons learned..."
          rows={3}
        />
      </div>

      {/* Status Messages */}
      {response && (
        <p className={`font-mono text-xs tracking-wider ${response.type === 'success' ? 'text-long' : 'text-short'}`}>
          {response.message}
        </p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? 'SUBMITTING...' : 'SUBMIT OUTCOME'}
      </button>
    </form>
  );
}
