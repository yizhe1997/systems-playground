import ResumeStatusTracker from '@/components/ResumeStatusTracker';

export default async function ResumeStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
      <main className="flex-1 w-full bg-white">
      <div className="max-w-4xl mx-auto px-6 py-20 w-full">
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

        <div className="mt-16 pt-10 border-t-2 border-black/10">
          <h2
            className="text-xl mb-3 text-black"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Why an AI triage step at all?
          </h2>
          <p className="text-sm text-[var(--ds-charcoal)]/70 max-w-2xl">
            Every resume request used to get the exact same manual review, regardless of how obviously legitimate
            or spammy it was. Claude Haiku 4.5 now reads each request first and flags a legitimacy verdict plus a
            short read on role fit - cheap and fast enough to run on every submission. It doesn&apos;t decide
            anything on its own: the verdict is advisory context for the actual human decision, not a gate. If the
            model call fails for any reason, the request still goes to manual review - nothing gets silently
            dropped.
          </p>
        </div>
      </div>
      </main>
  );
}
