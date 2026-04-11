import { ShowroomCharts } from '../../components/tradingcopilot/ShowroomCharts';

type ShowroomResponse = {
  performance: Record<string, unknown>;
  strategyOverview: string;
  activePreview?: Record<string, unknown>;
  latestClosedSummary?: Record<string, unknown>;
};

async function loadShowroom(): Promise<ShowroomResponse> {
  const appBaseUrl = process.env.GOLD_COPILOT_FRONTEND_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const res = await fetch(`${appBaseUrl}/api/proxy/showroom/summary`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`showroom fetch failed: ${res.status}`);
  }
  return res.json();
}

export default async function ShowroomPage() {
  const data = await loadShowroom();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Gold Futures Showroom</h1>
        <p className="text-slate-600">{data.strategyOverview}</p>
      </header>
      <ShowroomCharts
        performance={data.performance}
        activePreview={data.activePreview}
        latestClosedSummary={data.latestClosedSummary}
      />
    </main>
  );
}
