'use client';

import { useState } from 'react';

export function JournalForm() {
  const [tradePlanId, setTradePlanId] = useState('');
  const [entryPrice, setEntryPrice] = useState(0);
  const [exitPrice, setExitPrice] = useState(0);
  const [positionSize, setPositionSize] = useState(1);
  const [creatorNotes, setCreatorNotes] = useState('');
  const [response, setResponse] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tradePlanId) {
      setResponse('tradePlanId is required');
      return;
    }

    const payload = {
      entryPrice,
      exitPrice,
      positionSize,
      creatorNotes,
      closedAt: new Date().toISOString(),
    };

    const res = await fetch(`/api/proxy/creator/outcome?id=${tradePlanId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    setResponse(`${res.status}: ${text}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">Post-Trade Journal</h3>
      <input className="border rounded px-3 py-2 w-full" placeholder="Trade Plan ID" value={tradePlanId} onChange={(e) => setTradePlanId(e.target.value)} />
      <input className="border rounded px-3 py-2 w-full" type="number" step="0.1" placeholder="Entry Price" value={entryPrice} onChange={(e) => setEntryPrice(Number(e.target.value))} />
      <input className="border rounded px-3 py-2 w-full" type="number" step="0.1" placeholder="Exit Price" value={exitPrice} onChange={(e) => setExitPrice(Number(e.target.value))} />
      <input className="border rounded px-3 py-2 w-full" type="number" step="0.1" placeholder="Position Size" value={positionSize} onChange={(e) => setPositionSize(Number(e.target.value))} />
      <textarea className="border rounded px-3 py-2 w-full" placeholder="Creator notes" value={creatorNotes} onChange={(e) => setCreatorNotes(e.target.value)} />
      <button className="rounded bg-black text-white px-4 py-2 text-sm" type="submit">Submit Outcome</button>
      {response ? <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto">{response}</pre> : null}
    </form>
  );
}
