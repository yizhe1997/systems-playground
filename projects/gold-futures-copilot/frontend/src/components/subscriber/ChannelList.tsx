'use client';

import { useState } from 'react';

type Channel = {
  id: string;
  type: string;
  destination: string;
  addedAt: string;
};

type ChannelListProps = {
  channels: Channel[];
};

export function ChannelList({ channels: initialChannels }: ChannelListProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    
    // Simulate API call - in production this would be a real DELETE request
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setChannels((prev) => prev.filter((channel) => channel.id !== id));
    setDeletingId(null);
  }

  if (channels.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="font-mono text-2xl text-secondary tracking-widest">
          NO CHANNELS CONFIGURED
        </p>
        <p className="text-sm text-secondary">
          Add one above to start receiving trade signals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {channels.map((channel, index) => (
        <div key={channel.id}>
          <div className="flex items-center gap-4 md:gap-8 py-4 font-mono text-sm group">
            {/* Number */}
            <span className="text-secondary w-8">
              {(index + 1).toString().padStart(2, '0')}.
            </span>
            
            {/* Type */}
            <span className="text-gold uppercase tracking-wider w-24">
              {channel.type}
            </span>
            
            {/* Destination */}
            <span className="flex-1 text-primary truncate">
              {channel.destination}
            </span>
            
            {/* Added Date */}
            <span className="hidden md:block text-secondary text-xs tracking-wider">
              ADDED {channel.addedAt}
            </span>
            
            {/* Delete Button */}
            <button
              onClick={() => handleDelete(channel.id)}
              disabled={deletingId === channel.id}
              className="text-secondary hover:text-short transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              aria-label={`Delete ${channel.type} channel`}
            >
              {deletingId === channel.id ? (
                <span className="font-mono text-xs">...</span>
              ) : (
                <span className="text-lg">×</span>
              )}
            </button>
          </div>
          
          {/* Hairline divider */}
          {index < channels.length - 1 && <div className="hairline-h" />}
        </div>
      ))}
    </div>
  );
}
