'use client';

import { useState } from 'react';

export function AlertChannelSettings() {
  const [subscriberUserId, setSubscriberUserId] = useState('demo-subscriber');
  const [channelType, setChannelType] = useState<'telegram' | 'discord' | 'webhook'>('telegram');
  const [destination, setDestination] = useState('');
  const [response, setResponse] = useState<string>('');

  async function saveChannel(e: React.FormEvent) {
    e.preventDefault();
    setResponse('Saving...');

    const res = await fetch('/api/proxy/subscriber/alert-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriberUserId, channelType, destination }),
    });

    const text = await res.text();
    setResponse(`${res.status}: ${text}`);
  }

  return (
    <form className="space-y-3 rounded-lg border p-4" onSubmit={saveChannel}>
      <h3 className="font-semibold">Alert Channel Settings</h3>
      <input className="border rounded px-3 py-2 w-full" value={subscriberUserId} onChange={(e) => setSubscriberUserId(e.target.value)} placeholder="Subscriber User ID" />
      <select className="border rounded px-3 py-2 w-full" value={channelType} onChange={(e) => setChannelType(e.target.value as 'telegram' | 'discord' | 'webhook')}>
        <option value="telegram">Telegram</option>
        <option value="discord">Discord</option>
        <option value="webhook">Webhook</option>
      </select>
      <input className="border rounded px-3 py-2 w-full" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination (chat id / URL / webhook)" />
      <button className="rounded bg-black text-white px-4 py-2 text-sm" type="submit">Save Channel</button>
      {response ? <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto">{response}</pre> : null}
    </form>
  );
}
