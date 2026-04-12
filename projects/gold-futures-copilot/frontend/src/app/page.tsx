import { HeroStats } from '@/components/dashboard/HeroStats';
import { SessionBias } from '@/components/dashboard/SessionBias';
import { RecentPlans } from '@/components/dashboard/RecentPlans';

// Mock data - would come from API in production
const mockStats = {
  winRate: 68,
  avgRiskReward: 2.4,
  activePlans: 3,
};

const mockBias = {
  direction: 'long' as const,
  entryLow: 2345.0,
  entryHigh: 2348.5,
  note: 'Bullish momentum building above key support. Session bias favors long entries on pullbacks to entry zone.',
  nextSessionCountdown: '04:23:15',
};

const mockPlans: Array<{
  id: string;
  instrument: string;
  bias: 'long' | 'short' | 'neutral';
  entryRange: string;
  status: 'active' | 'closed' | 'invalidated';
}> = [
  { id: '01', instrument: 'GC', bias: 'long', entryRange: '2345.0–2348.5', status: 'active' },
  { id: '02', instrument: 'GC', bias: 'short', entryRange: '2372.0–2375.0', status: 'closed' },
  { id: '03', instrument: 'GC', bias: 'long', entryRange: '2318.5–2322.0', status: 'closed' },
  { id: '04', instrument: 'GC', bias: 'neutral', entryRange: '2340.0–2345.0', status: 'invalidated' },
];

export default function DashboardPage() {
  return (
    <main className="px-6 py-12 md:px-12 lg:px-24 max-w-7xl mx-auto space-y-16">
      {/* Hero Stats Row */}
      <HeroStats 
        winRate={mockStats.winRate}
        avgRiskReward={mockStats.avgRiskReward}
        activePlans={mockStats.activePlans}
      />

      {/* Session Bias Section */}
      <section>
        <span className="section-marker">[ TODAY&apos;S SESSION BIAS ]</span>
        <div className="mt-6">
          <SessionBias {...mockBias} />
        </div>
      </section>

      {/* Recent Plans Section */}
      <section>
        <span className="section-marker">[ RECENT PLANS ]</span>
        <div className="mt-6">
          <RecentPlans plans={mockPlans} />
        </div>
      </section>
    </main>
  );
}
