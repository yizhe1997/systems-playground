import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import InfiniteStairs from '@/components/originkit/infinite-stairs';

// Wired in via the Originkit MCP - `get_component` for "infinite-stairs" - and dropped in
// unmodified per its own agent brief (src/components/originkit, since this project has a src/
// folder). The only thing tuned here is what gets passed as props: dark DS charcoal instead of
// pure black, white stripes as the base, and a thin ds-yellow accentMix so the DS palette shows
// up without touching the shader itself. accentColor is a literal hex, not var(--ds-yellow) - the
// component resolves colors with its own JS-side parseColor(), which can't read CSS custom
// properties (the same class of bug that made the old Neon Border badge render invisible-black
// on BlogIpadFrame).
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="relative flex-1 w-full overflow-hidden text-white" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
        <InfiniteStairs
          background="var(--ds-charcoal)"
          baseColor="#ffffff"
          accentColor="#ffe17c"
          accentMix={12}
          density={26}
          speed={16}
          direction="descend"
          style={{ position: 'absolute', inset: 0, minWidth: 0, minHeight: 0 }}
        />
        {/* A radial scrim behind the copy, not over the whole stage - the stripes stay fully
            visible at the edges (that's the point of the background) but fade out directly behind
            the text so it doesn't have to fight a moving black-and-white pattern for contrast. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 640px 420px at 50% 50%, rgba(23,30,25,0.82) 0%, rgba(23,30,25,0.55) 45%, transparent 75%)' }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-28 min-h-[70vh]">
          <h1
            className="text-white leading-none"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(4.5rem, 14vw, 9rem)', textShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
          >
            404
          </h1>
          <p className="mt-4 text-lg sm:text-xl font-bold text-white/90">Wrong step.</p>
          <p className="mt-2 max-w-md text-sm sm:text-base text-white/60">
            This page doesn&apos;t exist, or it&apos;s still somewhere on these stairs. Either way,
            you won&apos;t find it by scrolling further.
          </p>
          <Link
            href="/"
            data-cursor-label="Home"
            className="mt-8 inline-flex items-center px-6 py-3 border-2 border-black bg-[var(--ds-yellow)] text-[var(--ds-charcoal)] font-bold text-sm hover:bg-white transition-colors"
            style={{ borderRadius: '0.75rem' }}
          >
            Back to solid ground
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
