'use client';

import { useState } from 'react';

type ChannelType = 'telegram' | 'discord' | 'webhook';

const channelConfig: Record<ChannelType, { label: string; placeholder: string; icon: string }> = {
  telegram: {
    label: 'TELEGRAM',
    placeholder: '@username or chat ID',
    icon: '◇',
  },
  discord: {
    label: 'DISCORD',
    placeholder: 'Channel name or webhook URL',
    icon: '◈',
  },
  webhook: {
    label: 'WEBHOOK',
    placeholder: 'https://your-webhook-url.com/...',
    icon: '◉',
  },
};

export function AddChannelForm() {
  const [subscriberUserId, setSubscriberUserId] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('telegram');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResponse(null);

    try {
      const res = await fetch('/api/proxy/subscriber/alert-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberUserId, channelType, destination }),
      });

      if (res.ok) {
        setResponse({ type: 'success', message: 'CHANNEL SAVED SUCCESSFULLY' });
        setDestination('');
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

  const channelTypes: ChannelType[] = ['telegram', 'discord', 'webhook'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subscriber ID */}
      <div className="space-y-2">
        <label className="kpi-label block">SUBSCRIBER ID</label>
        <input
          type="text"
          value={subscriberUserId}
          onChange={(e) => setSubscriberUserId(e.target.value)}
          placeholder="Enter your subscriber ID..."
        />
      </div>

      {/* Channel Type Selection */}
      <div className="space-y-2">
        <label className="kpi-label block">CHANNEL TYPE</label>
        <div className="flex flex-wrap gap-2">
          {channelTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setChannelType(type)}
              className={`channel-pill ${channelType === type ? 'active' : ''}`}
            >
              <span>{channelConfig[type].icon}</span>
              {channelConfig[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* Destination */}
      <div className="space-y-2">
        <label className="kpi-label block">DESTINATION</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={channelConfig[channelType].placeholder}
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
        disabled={submitting || !subscriberUserId || !destination}
        className="btn-primary w-full"
      >
        {submitting ? 'SAVING...' : 'SAVE CHANNEL'}
      </button>
    </form>
  );
}
