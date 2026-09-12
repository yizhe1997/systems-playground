import ResumeStatusTracker from '@/components/ResumeStatusTracker';
import ResumeStatusFaq from '@/components/ResumeStatusFaq';

// This page is a private, unguessable-link tracker (the AI triage reasoning
// shown here can include sensitive-ish read on the requester) - it's meant
// to be reached only via the emailed link, never discovered. `noindex`
// keeps it out of search results / link-preview scrapers on the off chance
// a link is ever pasted somewhere crawlable.
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ResumeStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
      <main className="flex-1 w-full bg-white">
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 w-full">
        <h1
          className="mb-6 text-black"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          How it&apos;s going
        </h1>
        <p className="text-lg font-medium max-w-2xl mb-14 text-[var(--ds-charcoal)]/80">
          This isn&apos;t a spinner - it&apos;s the actual pipeline your request is moving through right now,
          including a real AI model call.
        </p>

        <ResumeStatusTracker id={id} />

        <div className="mt-6">
          <ResumeStatusFaq />
        </div>
      </div>
      </main>
  );
}
