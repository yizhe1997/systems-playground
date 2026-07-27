import Link from 'next/link';
import { Bot, Boxes, GitBranch, Server, Container, ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const stack = [
  { icon: Bot, label: 'Claude Code', detail: 'AI pair-programmer for the build itself' },
  { icon: Boxes, label: 'Next.js', detail: 'App Router, this frontend' },
  { icon: Server, label: 'Go', detail: 'Control-plane backend, self-hosted' },
  { icon: Container, label: 'Docker', detail: 'Every service, containerized' },
  { icon: GitBranch, label: 'Self-hosted infra', detail: 'Runs on hardware I operate, not a managed PaaS' },
];

export default function HowThisWasBuiltPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <div className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
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
          How this was built
        </h1>
        <p className="text-lg font-medium max-w-2xl mb-16 text-[var(--ds-charcoal)]/80">
          This site is self-hosted, and built with an AI collaborator in the loop &mdash; not just for code, but for
          the design decisions on this page too.
        </p>

        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Built with
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {stack.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="flex items-start gap-4 bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000]"
              style={{ borderRadius: '0.75rem' }}
            >
              <div
                className="w-10 h-10 shrink-0 flex items-center justify-center border-2 border-black"
                style={{ backgroundColor: 'var(--ds-yellow)', borderRadius: '0.5rem' }}
              >
                <Icon className="w-5 h-5 text-black" aria-hidden="true" />
              </div>
              <div>
                <p className="font-extrabold">{label}</p>
                <p className="text-sm text-[var(--ds-charcoal)]/70">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          The build log
        </h2>
        <div
          className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_#000] mb-6"
          style={{ borderRadius: '0.75rem' }}
        >
          <p className="font-bold mb-1">Curated write-up coming soon</p>
          <p className="text-sm text-[var(--ds-charcoal)]/70 max-w-xl">
            The real prompt-to-shipped-code walkthrough &mdash; before/after comparisons, the actual decisions and
            dead ends &mdash; is being drafted from this build&apos;s real history rather than written after the
            fact.
          </p>
        </div>

        <Link
          href="/docs"
          className="inline-flex items-center gap-2 font-bold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          Read the engineering docs in the meantime
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
