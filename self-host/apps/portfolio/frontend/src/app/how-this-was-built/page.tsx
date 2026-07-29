import Link from 'next/link';
import { Bot, Boxes, GitBranch, Server, Container, ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { timeline, beforeAfterGallery } from '@/content/how-this-was-built';

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

        {/* Built with */}
        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Built with
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-20">
          {stack.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="group flex items-start gap-4 bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ borderRadius: '0.75rem' }}
            >
              <div
                className="w-10 h-10 shrink-0 flex items-center justify-center border-2 border-black transition-colors group-hover:bg-black"
                style={{ backgroundColor: 'var(--ds-yellow)', borderRadius: '0.5rem' }}
              >
                <Icon className="w-5 h-5 text-black transition-colors group-hover:text-[var(--ds-yellow)]" aria-hidden="true" />
              </div>
              <div>
                <p className="font-extrabold">{label}</p>
                <p className="text-sm text-[var(--ds-charcoal)]/70">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Build timeline */}
        <h2
          className="text-2xl mb-2 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          The build timeline
        </h2>
        <p className="text-sm text-[var(--ds-charcoal)]/70 max-w-xl mb-10">
          Real moments from this site&apos;s actual build session &mdash; including the parts that didn&apos;t work the
          first time.
        </p>
        <div className="relative mb-20">
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-black/15 hidden sm:block" aria-hidden="true" />
          <div className="space-y-6">
            {timeline.map((moment, i) => (
              <div key={i} className="relative sm:pl-16">
                <div
                  className="hidden sm:flex absolute left-0 top-0 w-10 h-10 items-center justify-center bg-black text-white font-extrabold text-sm border-2 border-black"
                  style={{ fontFamily: 'var(--ds-font-display)', borderRadius: '0.5rem' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div
                  className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_#000]"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <p className="text-sm italic text-[var(--ds-charcoal)]/70 mb-3">&ldquo;{moment.prompt}&rdquo;</p>
                  <p className="text-sm mb-3">
                    <span className="font-extrabold uppercase tracking-wider text-xs text-[var(--ds-charcoal)]/50 mr-2">Decision</span>
                    {moment.decision}
                  </p>
                  <p
                    className="text-sm font-medium p-3 border-2 border-black"
                    style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}
                  >
                    <span className="font-extrabold uppercase tracking-wider text-xs mr-2">Result</span>
                    {moment.result}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Before / after */}
        <h2
          className="text-2xl mb-2 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Before / after
        </h2>
        <p className="text-sm text-[var(--ds-charcoal)]/70 max-w-xl mb-10">
          A few real diffs from this build, not staged examples.
        </p>
        <div className="space-y-10 mb-20">
          {beforeAfterGallery.map((item) => (
            <div key={item.title}>
              <p className="font-extrabold mb-1">{item.title}</p>
              <p className="text-sm text-[var(--ds-charcoal)]/70 mb-4 max-w-2xl">{item.context}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border-2 border-black overflow-hidden" style={{ borderRadius: '0.75rem' }}>
                  <div className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider bg-white border-b-2 border-black">
                    Before
                  </div>
                  <pre
                    className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-white"
                    style={{ backgroundColor: 'var(--ds-charcoal)' }}
                  >
                    <code>{item.before}</code>
                  </pre>
                </div>
                <div className="border-2 border-black overflow-hidden" style={{ borderRadius: '0.75rem' }}>
                  <div
                    className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 border-black"
                    style={{ backgroundColor: 'var(--ds-sage)' }}
                  >
                    After
                  </div>
                  <pre
                    className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-white"
                    style={{ backgroundColor: 'var(--ds-charcoal)' }}
                  >
                    <code>{item.after}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reflection */}
        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          What I&apos;d do differently
        </h2>
        <div
          className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] mb-16"
          style={{ borderRadius: '0.75rem' }}
        >
          <p className="font-bold mb-1">Not written yet</p>
          <p className="text-sm text-[var(--ds-charcoal)]/70 max-w-xl">
            This part has to be my own honest take, not something generated for me &mdash; it&apos;s the section that
            actually signals judgment, not just tool usage.
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
