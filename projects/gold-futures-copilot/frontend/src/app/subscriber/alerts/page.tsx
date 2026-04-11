import { AlertChannelSettings } from '../../../components/tradingcopilot/AlertChannelSettings';

export default function SubscriberAlertsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Subscriber Alerts</h1>
      <p className="text-sm text-slate-600">Configure Telegram/Discord/Webhook channels for real-time trade updates.</p>
      <AlertChannelSettings />
    </main>
  );
}
