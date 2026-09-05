'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Hand, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { playBlip } from '@/lib/blip-sound';
import CopySectionLinkButton from '@/components/CopySectionLinkButton';
import { FALL_IN_INITIAL, FALL_IN_ANIMATE, FALL_IN_SPRING } from '@/lib/motion';
import { useIsLargeScreen } from '@/hooks/use-large-screen';

// Hoisted to module scope so these keep the same identity across renders. Defined inline inside
// the component (as they were originally), react-markdown remounts fresh DOM for every heading
// on every render where the identity changes - and since a scroll-driven state update
// re-renders this component on every scroll tick, that meant a FRESH h2 element was created on
// the very next tick after mount, permanently orphaning the elements the scrollspy's listener
// below had captured (confirmed via debug instrumentation: after that, every heading read back
// isConnected: false, so getBoundingClientRect() returned all zeros for all of them, and the
// "last heading whose top is above the line" loop never broke - always landing on the last
// section regardless of actual scroll position, which is exactly the "gets stuck" symptom).
function MarkdownH2({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
  const text = String(children);
  const slug = slugify(text);
  return (
    <h2 {...props} id={slug} className="group/heading scroll-mt-2 border-b-2 border-black/15 pb-2 flex items-baseline gap-1.5">
      <span>{children}</span>
      <CopySectionLinkButton sectionId={slug} label={text} />
    </h2>
  );
}
function MarkdownBlockquote({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote {...props} className="not-italic border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
      {children}
    </blockquote>
  );
}
function MarkdownHr(props: React.ComponentPropsWithoutRef<'hr'>) {
  return <hr {...props} className="my-10 border-t-2 border-black/20" />;
}
const MARKDOWN_COMPONENTS: Components = { h2: MarkdownH2, blockquote: MarkdownBlockquote, hr: MarkdownHr };

const CONTACTLESS_PATH =
  'M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8m6-7a7 7 0 1 0 0 14A7 7 0 0 0 8 1m1.864 3.144a.516.516 0 0 0-.716 0a.485.485 0 0 0 0 .698a4.386 4.386 0 0 1 0 6.316a.485.485 0 0 0 0 .698a.516.516 0 0 0 .716 0a5.355 5.355 0 0 0 0-7.712m-2.02 1.004a.486.486 0 0 0-.7 0a.515.515 0 0 0 0 .716a3.07 3.07 0 0 1 0 4.27a.515.515 0 0 0 0 .716a.486.486 0 0 0 .7 0c1.536-1.575 1.536-4.127 0-5.702M5.138 6.153a.444.444 0 0 1 .671 0c.925 1.02.925 2.674 0 3.694a.444.444 0 0 1-.67 0a.56.56 0 0 1 0-.741a1.68 1.68 0 0 0 0-2.212a.56.56 0 0 1 0-.741';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '∗', '0', '#'];
const MAX_PIN_DISPLAY = 12;

// Superficial receipt line items - purely decorative, filling out the paper so it doesn't read
// as an almost-empty slip with a button stapled to it.
const RECEIPT_LINES = [
  { label: 'Curiosity', value: 'free' },
  { label: 'One (1) reply', value: '$0.00' },
  { label: 'Tax (0%)', value: '$0.00' },
];

// The gap the mounting bracket bridges between the cabinet's casing and the terminal. Kept as
// one constant because the two ends of the bracket are computed from it (see below) - the
// bracket must span exactly this distance or it visibly floats short of one end.
const TERMINAL_GAP = 30;
// The receipt's own rendered height in px - also drives its SVG viewBox (see below) and where
// the terminal body starts inside its wrapper.
const RECEIPT_HEIGHT = 192;
// Where the terminal body actually starts inside its wrapper (receipt height minus the overlap
// it's pulled up by) - the bracket needs to land inside this range vertically, not just align
// in x, or it floats past empty space next to the receipt instead of touching the body.
const TERMINAL_BODY_TOP = RECEIPT_HEIGHT - 20;

type Section = { text: string; slug: string };
type ParsedDoc = { title: string; updated: string; sections: Section[]; mainBody: string; footerNote: string };

// A fast-food self-order kiosk that IS the reading surface at desktop widths, falling back to a
// plain page with a dropdown table of contents below lg (1024px) - see MobileLegalDocument. Two
// entirely separate components (not one component branching mid-render) because the kiosk owns
// several of its own hooks (scrollspy, keypad state) that can't be called conditionally; this
// mirrors how ProjectsCrtFrame/BlogIpadFrame are separate components picked by the same
// useIsLargeScreen hook rather than one component branching internally.
export default function LegalDocument({ raw }: { raw: string }) {
  const parsed = useMemo<ParsedDoc>(() => {
    const titleMatch = raw.match(/^\s*#\s+(.+)\n+/);
    const afterTitle = raw.replace(/^\s*#[^\n]*\n+/, '').trim();
    const updatedMatch = afterTitle.match(/\*\*Last updated:\*\*\s*(.+)/);
    // The "Last updated" line already surfaces in the left panel's header - drop it from the
    // body so it isn't shown twice.
    const withoutMeta = updatedMatch ? afterTitle.replace(updatedMatch[0], '').trim() : afterTitle;
    const parsedSections = Array.from(withoutMeta.matchAll(/^## (.+)$/gm)).map((m) => ({
      // Some documents (terms.md) number their own headings ("1. What this site is") - the TOC
      // row already carries its own 01/02/03 index, so strip a leading "N. " to avoid doubling up.
      text: m[1].replace(/^\d+\.\s*/, ''),
      slug: slugify(m[1]),
    }));
    // The trailing "drafted with AI assistance" disclaimer (after a --- rule) needs to render
    // AFTER the Message Me button, not before it - otherwise the button reads as a detached
    // "end of page" block instead of belonging to the Contact section right above it.
    const hrMatch = withoutMeta.match(/\n-{3,}\n/);
    const mainBody = hrMatch ? withoutMeta.slice(0, hrMatch.index).trim() : withoutMeta;
    const footerNote = hrMatch ? withoutMeta.slice(hrMatch.index).trim() : '';
    return {
      title: titleMatch ? titleMatch[1].trim() : '',
      updated: updatedMatch ? updatedMatch[1].trim() : '',
      sections: parsedSections,
      mainBody,
      footerNote,
    };
  }, [raw]);

  const isLargeScreen = useIsLargeScreen();
  return isLargeScreen ? <KioskLegalDocument {...parsed} /> : <MobileLegalDocument {...parsed} />;
}

// The left panel is a table of contents, the right panel is the full document, scrolling inside
// the kiosk screen - a scroll listener on the right panel highlights whichever section's heading
// is current in the left panel (a "scrollspy"). A side-mounted payment terminal has a working
// keypad (types into its own display, backspace/reset - it doesn't drive anything) and prints a
// "MESSAGE ME" receipt - hidden below min-[1480px] (measured empirically, not guessed: the kiosk
// cabinet centers at up to 1080px wide within the page's own padding, and the terminal sits
// outside it needing another ~200px - getBoundingClientRect showed real overflow (the terminal's
// right edge past the viewport, forcing a horizontal scrollbar) up to ~1460px, and a clean fit
// with room to spare from 1470px on).
function KioskLegalDocument({ title, updated, sections, mainBody, footerNote }: ParsedDoc) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? '');
  const [pinDisplay, setPinDisplay] = useState('');

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll('h2[id]')) as HTMLElement[];
    if (headings.length === 0) return;

    // Offset-based scrollspy: the active section is whichever heading is the last one to have
    // scrolled past a line near the top of the panel. This is deliberately NOT an
    // IntersectionObserver keyed on "is it currently visible" - with rootMargin narrowing the
    // detection band, there's a gap between one heading leaving that band and the next entering
    // it where NOTHING intersects, and the callback then has nothing to report - so activeSlug
    // just freezes wherever it last was (reproduced: it got stuck at section 02). Recomputing
    // "the last heading above the line" directly on every scroll has no such gap.
    const updateActive = () => {
      // The last section can be too short to ever push its own heading up to "line" - once the
      // remaining scrollable distance after it is less than the panel's own height, scrolling to
      // the very bottom still leaves that heading sitting mid-panel, so the line-crossing loop
      // below would never select it. Scrolled-to-bottom is unambiguous, so just special-case it.
      const atBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 2;
      if (atBottom) {
        setActiveSlug(headings[headings.length - 1].id);
        return;
      }
      const rootTop = root.getBoundingClientRect().top;
      const line = rootTop + 32;
      let current = headings[0];
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= line) current = h;
        else break;
      }
      setActiveSlug(current.id);
    };

    // Deliberately no rAF/debounce wrapper here: an earlier version gated the read behind
    // requestAnimationFrame with a "pending" flag to avoid reading mid-scroll, but if rAF never
    // fires - which happens whenever this pane is backgrounded, a documented quirk of this
    // environment - that flag stays stuck true forever and silently blocks every future update.
    // A plain, synchronous read on every scroll event has no such failure mode and this handler
    // is cheap enough (one loop over a dozen headings) to not need throttling anyway.
    updateActive();
    root.addEventListener('scroll', updateActive, { passive: true });
    return () => root.removeEventListener('scroll', updateActive);
  }, [mainBody]);

  const scrollToSection = (slug: string) => {
    // scrollIntoView scrolls EVERY scrollable ancestor needed to bring the target fully into
    // view - including the window itself if the kiosk isn't already fully in the viewport,
    // which reads as "the whole page jumps" on click. Computing the delta and adjusting this
    // panel's own scrollTop directly touches only this element, never the window.
    const root = contentRef.current;
    const target = root?.querySelector(`#${CSS.escape(slug)}`) as HTMLElement | null;
    if (root && target) {
      // -8 matches the heading's own scroll-mt-2 (0.5rem), so it lands with the same small gap
      // from the top of the panel that scrollIntoView used to give it.
      const delta = target.getBoundingClientRect().top - root.getBoundingClientRect().top - 8;
      root.scrollTop += delta;
    }
    // The scrollTop write above does fire a 'scroll' event, but we already know exactly which
    // section we're jumping to, so just set it directly rather than waiting on that handler.
    setActiveSlug(slug);
  };

  const pressKey = (k: string) => {
    playBlip();
    setPinDisplay((p) => (p + k).slice(0, MAX_PIN_DISPLAY));
  };
  const backspace = () => {
    playBlip();
    setPinDisplay((p) => p.slice(0, -1));
  };
  const resetPin = () => {
    playBlip();
    setPinDisplay('');
  };

  return (
    <div>
      {/* Falls from above and settles with a couple of bounces on load - the whole kiosk assembly
          (cabinet + stand), not the page around it. */}
      <motion.div
        className="relative mx-auto"
        style={{ maxWidth: 1080 }}
        initial={FALL_IN_INITIAL}
        animate={FALL_IN_ANIMATE}
        transition={FALL_IN_SPRING}
      >
        {/* sensor cap */}
        <div
          className="relative z-[2] mx-auto flex items-center justify-center border-[2.5px] border-black border-b-0"
          style={{ width: 110, height: 24, backgroundColor: 'var(--ds-charcoal)', borderRadius: '9px 9px 0 0' }}
        >
          <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: '#a32d2d' }} />
        </div>

        {/* cabinet - padding here is the visible charcoal casing around the (fixed-size) screen */}
        <div className="relative border-[3px] border-black" style={{ backgroundColor: 'var(--ds-charcoal)', borderRadius: 26, padding: 24 }}>
          <div style={{ backgroundColor: '#0d100e', borderRadius: 16, padding: 5 }}>
            <div className="flex flex-col overflow-hidden rounded-[12px] bg-white">
              {/* status bar */}
              <div
                className="flex items-center justify-between border-b-[3px] border-black px-5 py-3.5"
                style={{ backgroundColor: 'var(--ds-yellow)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center rounded-md text-xs font-extrabold"
                    style={{ width: 28, height: 28, backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)' }}
                  >
                    YZ
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--ds-charcoal)' }}>
                    Self-Serve Kiosk
                  </span>
                </div>
                <div className="flex items-center gap-2.5" style={{ color: 'var(--ds-charcoal)' }}>
                  <ShoppingCart className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                  <UtensilsCrossed className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                </div>
              </div>

              {/* screen: TOC (left, narrow, white) + the full document, scrolling (right, wide, yellow) */}
              <div className="flex flex-col md:flex-row" style={{ height: 'clamp(560px, 78vh, 820px)' }}>
                {/* left: table of contents */}
                <div className="shrink-0 overflow-y-auto px-5 py-5 max-h-[42%] md:max-h-none md:h-full md:w-[280px] md:border-r-[3px] md:border-black md:px-6 md:py-7">
                  <div className="group/heading flex items-baseline gap-1">
                    <h1
                      className="font-extrabold leading-tight"
                      style={{ fontFamily: 'var(--ds-font-display)', fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)', color: 'var(--ds-charcoal)' }}
                    >
                      {title}
                    </h1>
                    <CopySectionLinkButton label={title} />
                  </div>
                  {updated && (
                    <p className="mt-2 text-xs" style={{ color: 'rgba(23,30,25,0.6)' }}>
                      Last updated: {updated}
                    </p>
                  )}

                  <p className="mt-5 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(23,30,25,0.4)' }}>
                    Table of contents
                  </p>
                  <ul className="mt-1">
                    {sections.map((s, i) => {
                      const active = s.slug === activeSlug;
                      return (
                        <li
                          key={s.slug}
                          className="group/heading flex items-center gap-1 rounded-lg"
                          style={{ backgroundColor: active ? 'rgba(255,225,124,0.55)' : 'transparent' }}
                        >
                          <button
                            type="button"
                            onClick={() => scrollToSection(s.slug)}
                            className="flex flex-1 min-w-0 items-baseline gap-2.5 rounded-lg py-2 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                            style={{ color: 'var(--ds-charcoal)' }}
                          >
                            <span className="shrink-0 font-mono text-xs" style={{ color: active ? 'var(--ds-charcoal)' : 'rgba(23,30,25,0.5)' }}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="flex-1 truncate">{s.text}</span>
                          </button>
                          <CopySectionLinkButton sectionId={s.slug} label={s.text} />
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* right: the full document, scrollable */}
                <div
                  ref={contentRef}
                  className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 md:px-10 md:py-9"
                  style={{ backgroundColor: 'var(--ds-yellow)' }}
                >
                  <div className="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                      {mainBody}
                    </ReactMarkdown>

                    {/* Sits directly under the Contact section's own text (the doc's last
                        section) rather than as a detached "end of page" block - tight margin,
                        no extra visual break from the prose above it. The trailing "drafted
                        with AI assistance" disclaimer (footerNote, below) renders AFTER this on
                        purpose, so it doesn't sit between the section and the button. */}
                    <a
                      href="/#work-together"
                      className="not-prose mt-3 inline-flex items-center gap-2 border-2 border-black bg-black px-6 py-3.5 text-sm font-bold text-white shadow-[4px_4px_0px_0px_#000] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      style={{ borderRadius: '0.75rem' }}
                    >
                      <Hand className="h-4 w-4" aria-hidden="true" />
                      Message me
                    </a>

                    {footerNote && (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                        {footerNote}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* side-mounted payment terminal - decorative, min-[1360px] only (see this component's
              own top comment for why).
              left:100% resolves against the cabinet's padding box, 3px inside its visible
              border, so the offset below is TERMINAL_GAP + 3 to compensate; the bracket then
              spans exactly TERMINAL_GAP, reaching the casing on one end and the terminal's own
              (unshifted) left edge on the other - no dead space on either side. Its "top" is
              anchored inside TERMINAL_BODY_TOP so it actually meets the terminal body, not the
              receipt sitting in front of it. */}
          <div className="absolute z-10 hidden min-[1480px]:block" style={{ top: '30%', left: `calc(100% + ${TERMINAL_GAP + 3}px)` }}>
            <div
              className="absolute border-[2.5px] border-black"
              style={{ top: TERMINAL_BODY_TOP + 55, left: -TERMINAL_GAP, width: TERMINAL_GAP, height: 12, backgroundColor: 'var(--ds-charcoal)' }}
            />

            <div className="relative" style={{ width: 168 }}>
              {/* receipt, feeding upward out of the top slot. clip-path crops a box but never
                  extends its border along the new clipped silhouette - the torn zigzag edge
                  would render with no outline at all - so the torn shape is a real SVG polygon
                  (fill + stroke) instead, with the content layered on top. The viewBox matches
                  the wrapper's actual pixel size 1:1 (no preserveAspectRatio="none" stretch) -
                  stretching a square viewBox to fit a taller-than-wide box scales x and y
                  unevenly, which made the diagonal zigzag segments render at a different width
                  than the straight sides even with a non-scaling stroke. A round line join also
                  bulges outward at the zigzag's sharp (~110deg) corners, reading as extra
                  thickness right at each tooth - miter gives a clean point instead, matching a
                  real torn edge and keeping the stroke visually even along the whole outline. */}
              <div className="relative z-[2]" style={{ width: 140, height: RECEIPT_HEIGHT, margin: '0 auto -20px' }}>
                <svg viewBox={`0 0 140 ${RECEIPT_HEIGHT}`} className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
                  <polygon
                    points={`0,20 14,0 28,20 42,0 56,20 70,0 84,20 98,0 112,20 126,0 140,20 140,${RECEIPT_HEIGHT} 0,${RECEIPT_HEIGHT}`}
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={3}
                    strokeLinejoin="miter"
                  />
                </svg>
                <div className="relative" style={{ padding: '26px 15px 16px' }}>
                  {/* superficial line items, just to fill out the paper */}
                  <div className="space-y-1 border-t border-dashed pt-2.5" style={{ borderColor: 'rgba(23,30,25,0.35)' }}>
                    {RECEIPT_LINES.map((l) => (
                      <div key={l.label} className="flex items-center justify-between font-mono" style={{ fontSize: 10.5, color: 'rgba(23,30,25,0.6)' }}>
                        <span>{l.label}</span>
                        <span>{l.value}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-2.5 flex items-center justify-between border-t-2 border-black pt-2 font-mono font-extrabold"
                    style={{ fontSize: 13, color: 'var(--ds-charcoal)' }}
                  >
                    <span>TOTAL</span>
                    <span>$0.00</span>
                  </div>
                  <div className="mt-3 text-center font-mono" style={{ fontSize: 11, letterSpacing: '0.05em', color: 'rgba(23,30,25,0.5)' }}>
                    * * * * * * *
                  </div>
                </div>
              </div>

              {/* terminal body */}
              <div className="relative z-[1] border-[3px] border-black" style={{ backgroundColor: '#1f2721', borderRadius: 18, padding: '15px 14px' }}>
                <div className="border-[1.5px]" style={{ backgroundColor: '#0d100e', borderColor: '#000', borderRadius: 4, height: 11 }} />

                {/* live display - shows whatever's been typed on the keypad */}
                <div
                  className="mt-3 flex items-center justify-end border-[1.5px] px-2 font-mono font-bold"
                  style={{ backgroundColor: 'var(--ds-sage)', borderColor: '#000', borderRadius: 6, height: 40, fontSize: 15, color: 'var(--ds-charcoal)', letterSpacing: '0.05em' }}
                >
                  {pinDisplay}
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{ width: 28, height: 28, backgroundColor: '#0d100e', border: '2px solid #3a4038' }}
                  >
                    <svg width="17" height="17" viewBox="0 0 16 16" style={{ color: 'var(--ds-yellow)' }}>
                      <path fill="currentColor" d={CONTACTLESS_PATH} />
                    </svg>
                  </div>
                  <span className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'rgba(183,198,194,0.75)' }}>
                    Tap to pay
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-[5px]">
                  {KEYPAD_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => pressKey(k)}
                      aria-label={`Key ${k}`}
                      className="flex items-center justify-center font-semibold transition-colors hover:brightness-125 focus:outline-none"
                      style={{ height: 22, backgroundColor: '#3a4038', borderRadius: 4, fontSize: 12, color: '#e6e4dc' }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex gap-[5px]">
                  <button
                    type="button"
                    onClick={backspace}
                    aria-label="Backspace"
                    className="flex flex-1 items-center justify-center transition-colors hover:brightness-110 focus:outline-none"
                    style={{ height: 18, backgroundColor: '#a32d2d', borderRadius: 4 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={resetPin}
                    aria-label="Reset"
                    className="flex-1 transition-colors hover:brightness-110 focus:outline-none"
                    style={{ height: 18, backgroundColor: 'var(--ds-yellow)', borderRadius: 4 }}
                  />
                  <button
                    type="button"
                    onClick={resetPin}
                    aria-label="Reset"
                    className="flex flex-1 items-center justify-center transition-colors hover:brightness-110 focus:outline-none"
                    style={{ height: 18, backgroundColor: '#4a7c4e', borderRadius: 4 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* two-column stand, joined into one shared base */}
        <div className="mx-auto flex justify-center" style={{ width: '100%', maxWidth: 460, gap: '38%', marginTop: -2 }}>
          <div className="border-x-[3px] border-black" style={{ width: 30, height: 110, backgroundColor: 'var(--ds-charcoal)' }} />
          <div className="border-x-[3px] border-black" style={{ width: 30, height: 110, backgroundColor: 'var(--ds-charcoal)' }} />
        </div>
        <div className="mx-auto border-[3px] border-black" style={{ width: 320, height: 28, backgroundColor: 'var(--ds-charcoal)', borderRadius: 14, marginTop: -2 }} />
      </motion.div>
    </div>
  );
}

// Below lg (1024px) - no kiosk chrome and no table of contents UI at all (matching how /projects
// and /blog drop their own device frame at the same breakpoint). Just the document, since a
// dropdown TOC on top of an already-short mobile viewport read as more chrome than the content
// warranted - each section's own heading carries its own copy-link button (see MarkdownH2) as
// the way to grab a link to it, same as desktop.
function MobileLegalDocument({ title, updated, mainBody, footerNote }: ParsedDoc) {
  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="group/heading flex items-baseline gap-1">
        <h1
          className="font-extrabold leading-tight"
          style={{ fontFamily: 'var(--ds-font-display)', fontSize: 'clamp(1.9rem, 8vw, 2.4rem)', color: 'var(--ds-charcoal)' }}
        >
          {title}
        </h1>
        <CopySectionLinkButton label={title} />
      </div>
      {updated && (
        <p className="mt-2 text-xs" style={{ color: 'rgba(23,30,25,0.6)' }}>
          Last updated: {updated}
        </p>
      )}

      <div className="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline max-w-none mt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {mainBody}
        </ReactMarkdown>

        <a
          href="/#work-together"
          className="not-prose mt-3 inline-flex items-center gap-2 border-2 border-black bg-black px-6 py-3.5 text-sm font-bold text-white shadow-[4px_4px_0px_0px_#000] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          style={{ borderRadius: '0.75rem' }}
        >
          <Hand className="h-4 w-4" aria-hidden="true" />
          Message me
        </a>

        {footerNote && (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {footerNote}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
