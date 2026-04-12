import { TradePlanForm } from '@/components/creator/TradePlanForm';
import { OutcomeJournal } from '@/components/creator/OutcomeJournal';
import { RecentPlans } from '@/components/dashboard/RecentPlans';

// Mock data - would come from API in production
const mockPlans = [
  { id: '01', instrument: 'GC', bias: 'long' as const, entryRange: '2345.0–2348.5', status: 'active' as const },
  { id: '02', instrument: 'GC', bias: 'short' as const, entryRange: '2372.0–2375.0', status: 'closed' as const },
  { id: '03', instrument: 'GC', bias: 'long' as const, entryRange: '2318.5–2322.0', status: 'closed' as const },
];

export default function CreatorStudioPage() {
  return (
    <main className="px-6 py-12 md:px-12 lg:px-24 max-w-7xl mx-auto space-y-16">
      {/* Page Header */}
      <header>
        <span className="section-marker">[ CREATOR STUDIO ]</span>
      </header>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-0">
        {/* Left Column: New Trade Plan */}
        <div className="flex-1 lg:pr-12">
          <span className="section-marker text-secondary">[ NEW PLAN ]</span>
          <div className="mt-8">
            <TradePlanForm />
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hairline-h lg:hidden" />
        <div className="hairline-v hidden lg:block" />

        {/* Right Column: Log Outcome */}
        <div className="flex-1 lg:pl-12">
          <span className="section-marker text-secondary">[ LOG OUTCOME ]</span>
          <div className="mt-8">
            <OutcomeJournal />
          </div>
        </div>
      </div>

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
