import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <h1
          className="mb-12 text-black"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          About
        </h1>

        <p className="text-lg font-medium max-w-2xl mb-14">
          Chin Yi Zhe &mdash; Backend / Platform Engineer. Builds and operates real self-hosted infrastructure,
          with AI as a working collaborator rather than a novelty.
        </p>

        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Work history
        </h2>

        <div
          className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] max-w-xl"
          style={{ borderRadius: '0.75rem' }}
        >
          <p className="font-bold mb-1">Not published yet</p>
          <p className="text-sm text-[var(--ds-charcoal)]/70">
            Real role history lands here once it&apos;s written up &mdash; nothing fabricated to fill the gap in the
            meantime.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
