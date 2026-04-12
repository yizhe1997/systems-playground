import { AddChannelForm } from '@/components/subscriber/AddChannelForm';
import { ChannelList } from '@/components/subscriber/ChannelList';

const mockChannels = [
  { id: '1', type: 'telegram', destination: '@mychatid', addedAt: '2026-01-15' },
  { id: '2', type: 'discord', destination: 'trading-signals', addedAt: '2026-02-03' },
];

export default function SubscriberIndexPage() {
  return (
    <main className="px-6 py-12 md:px-12 lg:px-24 max-w-4xl mx-auto space-y-16">
      <header>
        <span className="section-marker text-4xl md:text-5xl lg:text-6xl">[ ALERT CHANNELS ]</span>
      </header>

      <section>
        <span className="section-marker">[ ADD CHANNEL ]</span>
        <div className="mt-8">
          <AddChannelForm />
        </div>
      </section>

      <section>
        <span className="section-marker">[ YOUR CHANNELS ]</span>
        <div className="mt-6">
          <ChannelList channels={mockChannels} />
        </div>
      </section>
    </main>
  );
}
