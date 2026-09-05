'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Wand2, CircleCheck, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ClickEffects from '@/components/originkit/clickeffects';
import Typewriter from '@/components/originkit/typewriter';

const navLinks = [
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

// The one real entry today, plus a couple of placeholders so the dialog reads as "more are
// coming", not as a single-item list that happens to be dressed up as a picker. "Push Button" is
// this design's own name, pulled from DESIGN.md/layout.tsx's own comment ("Neo-Brutalist 'Push
// Button' direction") rather than invented fresh here.
const DESIGNS: { name: string; description: string; active?: boolean }[] = [
  { name: 'Push Button', description: 'The neo-brutalist look you’re on right now — thick borders, hard shadows, bold color blocks.', active: true },
  { name: '???', description: 'Coming soon.' },
  { name: '???', description: 'Coming soon.' },
];

function DesignOption({ name, description, active }: { name: string; description: string; active?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 border-2 border-black p-3.5"
      style={{ borderRadius: '0.6rem', backgroundColor: active ? 'var(--ds-yellow)' : '#fff', opacity: active ? 1 : 0.6 }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm" style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-charcoal)' }}>
          {name}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ds-charcoal)', opacity: 0.7 }}>
          {description}
        </div>
      </div>
      {active ? (
        <CircleCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--ds-charcoal)' }} aria-hidden="true" />
      ) : (
        <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-charcoal)', opacity: 0.5 }} aria-hidden="true" />
      )}
    </div>
  );
}

// Same visual language as HeroSection's "Talk to this portfolio" button, scaled down to fit a
// h-20 header bar instead of the hero's own larger spacing.
const shiftRealityButtonClass =
  'inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-bold text-sm border-2 border-black shadow-[3px_5px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2';

export default function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [designDialogOpen, setDesignDialogOpen] = useState(false);

  // Escape-to-close - the previous Sheet-based menu got this for free from Radix; hand-rolling
  // the dropdown means picking it back up explicitly.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileMenuOpen]);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[100]">
        <ClickEffects interactionMode="burst" duration={0.4} strokeWidth={3} effectSize={70} showLabel={false} />
      </div>
      <header className="sticky top-0 z-50 w-full h-20 bg-[var(--ds-yellow)] border-b-2 border-black flex items-center">
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/" data-cursor-label="Home" className="flex items-center gap-2 group justify-self-start" aria-label="Home">
          <div
            className="w-10 h-10 flex items-center justify-center bg-black text-[var(--ds-yellow)] text-sm border-2 border-black"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, borderRadius: '0.5rem' }}
          >
            YZ
          </div>
          <span className="inline-block align-middle" style={{ height: '1.375rem' }}>
            <Typewriter
              texts={['Portfolio', 'Showcase', 'Corner']}
              color="var(--ds-charcoal)"
              typedColor="var(--ds-charcoal)"
              cursorColor="var(--ds-charcoal)"
              cursorChar="_"
              // Slower than the component's own default (0.07s/char type,
              // 1.5s hold) - the default cycled through words too quickly
              // to comfortably read.
              ease={{ type: 'tween', duration: 0.11, delay: 2.6, ease: 'easeInOut' }}
              deleteSpeed={0.16}
              font={{
                fontFamily: 'var(--ds-font-display)',
                fontWeight: 800,
                fontSize: '1.125rem',
                letterSpacing: '-0.025em',
                lineHeight: '1.4em',
              }}
            />
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-8 font-bold text-sm justify-self-center" style={{ color: 'var(--ds-charcoal)' }}>
          {navLinks.map((link) => (
            // py-3 -my-3 expands the tap target to WCAG 2.2's 24px AA floor
            // (closer to the 44px mobile guideline) without changing the
            // visible gap between links - the negative margin cancels the
            // padding's effect on surrounding layout.
            <Link
              key={link.href}
              href={link.href}
              data-cursor-label="Open"
              className="inline-block py-3 -my-3 hover:opacity-70 transition-opacity"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="justify-self-end flex items-center">
          {/* Desktop only - this grid cell is otherwise empty at sm+ (the hamburger below is
              mobile-only), so the button lives here instead of needing a 4th grid column. */}
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={() => setDesignDialogOpen(true)}
              data-cursor-label="Open"
              className={shiftRealityButtonClass}
              style={{ borderRadius: '0.75rem' }}
            >
              <Wand2 className="w-4 h-4" aria-hidden="true" />
              Shift Reality
            </button>
          </div>

        <div className="sm:hidden relative">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
            data-cursor-label={mobileMenuOpen ? 'Close' : 'Menu'}
            className="p-2.5 -mr-2.5"
            style={{ color: 'var(--ds-charcoal)' }}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* A compact dropdown anchored to the trigger, not a full-height side panel - the old
              Sheet-based menu (h-full, only 3 short links) read as a mostly-empty panel. The dark
              backdrop stays (click it to dismiss), it just no longer implies a big sliding drawer. */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div
                  className="fixed inset-0 z-40 bg-black/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-hidden="true"
                />
                <motion.div
                  className="absolute right-0 top-full mt-2 z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden"
                  style={{ borderRadius: '0.75rem', minWidth: 180, color: 'var(--ds-charcoal)' }}
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <nav className="flex flex-col font-bold text-sm py-2">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        data-cursor-label="Open"
                        className="block px-5 py-3 hover:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setDesignDialogOpen(true);
                      }}
                      data-cursor-label="Open"
                      className="flex items-center gap-2 border-t-2 border-black/10 px-5 py-3 text-left hover:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
                    >
                      <Wand2 className="w-4 h-4" aria-hidden="true" />
                      Shift Reality
                    </button>
                  </nav>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>
    </header>

    <Dialog open={designDialogOpen} onOpenChange={setDesignDialogOpen}>
      <DialogContent
        className="sm:max-w-md bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
        style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-black" style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}>
            Shift Reality
          </DialogTitle>
          <DialogDescription className="text-[var(--ds-charcoal)]/70 mt-2 text-sm">
            This portfolio is built to support more than one look. Pick a reality to render it in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 mt-2">
          {DESIGNS.map((d, i) => (
            <DesignOption key={i} name={d.name} description={d.description} active={d.active} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
