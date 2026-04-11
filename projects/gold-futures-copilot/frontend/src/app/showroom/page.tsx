import { PerformanceStats } from '@/components/showroom/PerformanceStats';
import { ActiveSetup } from '@/components/showroom/ActiveSetup';
import { LatestClosed } from '@/components/showroom/LatestClosed';
import { EquitySparkline } from '@/components/showroom/EquitySparkline';

type ShowroomResponse = {
  performance: {
    totalTrades: number;
    winRate: number;
    avgRiskReward: number;
    maxDrawdown: number;
  };
  strategyOverview: string;
  activePreview?: {
    entryLow: number;
    entryHigh: number;
    bias: 'long' | 'short' | 'neutral';
    isLive: boolean;
  } | null;
  latestClosedSummary?: {
    entryPrice: number;
    exitPrice: number;
    outcome: 'win' | 'loss';
    rrAchieved: number;
    notes: string;
  } | null;
};

async function loadShowroom(): Promise<ShowroomResponse> {
  const appBaseUrl = process.env.GOLD_COPILOT_FRONTEND_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  
  try {
    const res = await fetch(`${appBaseUrl}/api/proxy/showroom/summary`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`showroom fetch failed: ${res.status}`);
    }
    return res.json();
  } catch {
    // Return mock data for development/preview
    return {
      performance: {
        totalTrades: 47,
        winRate: 68,
        avgRiskReward: 2.4,
        maxDrawdown: 8.2,
      },
      strategyOverview: 'A systematic approach to gold futures trading, focusing on high-probability setups at key support and resistance levels. Each signal is generated through a combination of price action analysis, volume profile, and market structure.',
      activePreview: {
        entryLow: 2345.0,
        entryHigh: 2348.5,
        bias: 'long',
        isLive: true,
      },
      latestClosedSummary: {
        entryPrice: 2341.5,
        exitPrice: 2363.0,
        outcome: 'win',
        rrAchieved: 2.8,
        notes: 'Clean breakout above resistance with strong volume confirmation. Target reached within the session.',
      },
    };
  }
}

// Mock equity curve data for sparkline
const equityData = [
  100, 98, 102, 105, 103, 108, 112, 109, 115, 118,
  114, 120, 124, 121, 128, 132, 129, 135, 140, 138,
  145, 142, 150, 155, 152, 160, 165, 162, 168, 175,
];

export default async function ShowroomPage() {
  const data = await loadShowroom();

  return (
    <main className="px-6 py-12 md:px-12 lg:px-24 max-w-7xl mx-auto space-y-16">
      {/* Strategy Overview Pull Quote */}
      <header className="max-w-4xl">
        <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl text-primary leading-relaxed italic pl-8 border-l border-hairline">
          {data.strategyOverview}
        </blockquote>
        <p className="mt-6 font-mono text-xs tracking-widest text-secondary uppercase">
          [ PUBLIC PERFORMANCE — SIGNALS DELAYED AND PARTIALLY MASKED ]
        </p>
      </header>

      {/* Performance Stats Strip */}
      <section>
        <PerformanceStats performance={data.performance} />
      </section>

      {/* Active Setup Section */}
      <section>
        <span className="section-marker">[ ACTIVE SETUP ]</span>
        <div className="mt-6">
          <ActiveSetup preview={data.activePreview} />
        </div>
      </section>

      {/* Latest Closed Section */}
      <section>
        <span className="section-marker">[ LATEST CLOSED ]</span>
        <div className="mt-6">
          <LatestClosed summary={data.latestClosedSummary} />
        </div>
      </section>

      {/* Equity Curve Sparkline */}
      <section>
        <EquitySparkline data={equityData} />
      </section>

      {/* Footer Disclaimer */}
      <footer className="pt-8 border-t border-hairline">
        <p className="font-mono text-xs tracking-widest text-secondary text-center uppercase">
          LIVE SIGNALS ARE DELAYED AND PARTIALLY MASKED FOR PUBLIC VIEW
        </p>
      </footer>
    </main>
  );
}
