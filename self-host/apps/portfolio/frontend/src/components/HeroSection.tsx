'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileDown, ChevronLeft, ChevronRight, Lock, RotateCw } from 'lucide-react';
import ReactiveGrid from '@/components/originkit/reactivegrid';
import CrystalGlow from '@/components/originkit/crystal-glow';
import GravityGallery from '@/components/originkit/gravitygallery';

const isConfigured = (url: string) => !!url && url !== '#';

const formatUrl = (url: string) => {
  if (!url || url === '#') return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// UTF-8-safe base64 - btoa() only accepts Latin1, and emoji glyphs live
// outside that range, so the bytes have to go through TextEncoder first.
const toBase64 = (str: string) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));

// Flat SVG data URI - a brand-colored square with a centered glyph, no
// border baked in (the tile wrapper in gravitygallery.tsx supplies a single
// CSS border instead, so there's only ever one outline, not two stacked).
// Used for the Gravity Gallery tiles below: no network fetch, no
// broken-image flash before the physics engine has anything to drop.
// Base64-encoded rather than percent-encoded: GravityGallery (wired in
// verbatim, see originkit/gravitygallery.tsx) interpolates this src as an
// UNQUOTED `url(${src})`, and encodeURIComponent leaves `(`/`)` unescaped -
// the github/linkedin tiles' own `transform="translate(...)"` markup broke
// CSS's url() parsing that way. Base64's alphabet has no parentheses at all.
const svgTile = (bg: string, inner: string) =>
  `data:image/svg+xml;base64,${toBase64(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/>${inner}</svg>`
  )}`;

const GITHUB_PATH =
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';
const LINKEDIN_PATH =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.847-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';

// Same six line-art expressions as EmptyProjectCard's FACES - reused
// verbatim (not just "similar") so the gallery's face tiles are pixel-for-
// pixel the same drawing style as the empty-state cards elsewhere on the
// site. #ffe17c is --ds-yellow spelled out in hex: a data-URI SVG renders
// in its own isolated document, so a var(--ds-yellow) reference wouldn't
// resolve against this page's CSS custom properties.
type Face = { leftEye: string; rightEye: string; filled: boolean; mouth: string; rotate: number; tongue: string };
const FACES: Face[] = [
  { leftEye: 'M12.7 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0', rightEye: 'M23.7 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0', filled: true, mouth: 'M14 24c1.8 2 4 3 6 3s4.2-1 6-3', rotate: 0, tongue: '' },
  { leftEye: 'M14.5 15l1.2 2.6 2.8 1-2.8 1-1.2 2.6-1.2-2.6-2.8-1 2.8-1z', rightEye: 'M25.5 15l1.2 2.6 2.8 1-2.8 1-1.2 2.6-1.2-2.6-2.8-1 2.8-1z', filled: true, mouth: 'M13 23.2a7 5 0 0 0 14 0', rotate: -6, tongue: '' },
  { leftEye: 'M14.5 18m-2 0a2 2 0 1 1 4 0a1.3 1.3 0 1 1 -2.6 0a0.6 0.6 0 1 1 1.2 0', rightEye: 'M25.5 18m-2 0a2 2 0 1 1 4 0a1.3 1.3 0 1 1 -2.6 0a0.6 0.6 0 1 1 1.2 0', filled: false, mouth: 'M13 25q1.5 -3.5 3 0t3 0t3 0t3 0', rotate: 8, tongue: '' },
  { leftEye: 'M12.7 18.5q1.8 -2.4 3.6 0', rightEye: 'M23.7 18a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0', filled: false, mouth: 'M13 23.5c2 3 5 4 7 4s5-1 7-4', rotate: 0, tongue: 'M17.5 27q2.5 2.6 5 0' },
  { leftEye: 'M12.7 16.2l3.6 3.6m0 -3.6l-3.6 3.6', rightEye: 'M23.7 16.2l3.6 3.6m0 -3.6l-3.6 3.6', filled: false, mouth: 'M14 25.5q3 1.4 6 0t6 0', rotate: 4, tongue: '' },
  { leftEye: 'M14.5 16.3c-1-1.3-3-0.6-3 0.9c0 1.3 1.8 2.6 3 3.6c1.2-1 3-2.3 3-3.6c0-1.5-2-2.2-3-0.9z', rightEye: 'M25.5 16.3c-1-1.3-3-0.6-3 0.9c0 1.3 1.8 2.6 3 3.6c1.2-1 3-2.3 3-3.6c0-1.5-2-2.2-3-0.9z', filled: true, mouth: 'M13 23.5c2 3 5 4 7 4s5-1 7-4', rotate: 0, tongue: '' },
];

const faceTile = (bg: string, face: Face) =>
  svgTile(
    bg,
    `<g transform="translate(12,12)"><g transform="rotate(${face.rotate} 20 20)">
      <circle cx="20" cy="20" r="16" fill="#ffe17c" stroke="#000" stroke-width="2"/>
      <path d="${face.leftEye}" fill="${face.filled ? '#000' : 'none'}" stroke="${face.filled ? 'none' : '#000'}" stroke-width="2" stroke-linecap="round"/>
      <path d="${face.rightEye}" fill="${face.filled ? '#000' : 'none'}" stroke="${face.filled ? 'none' : '#000'}" stroke-width="2" stroke-linecap="round"/>
      <path d="${face.mouth}" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
      ${face.tongue ? `<path d="${face.tongue}" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>` : ''}
    </g></g>`
  );

// The gallery's default page - a handful of decorative face tiles (see
// FACES above). The real GitHub/LinkedIn tiles are prepended in the
// component body below, only when those URLs are actually configured.
const GALLERY_FACE_IMAGES = [
  { src: faceTile('#fafafa', FACES[0]) },
  { src: faceTile('#171e19', FACES[1]) },
  { src: faceTile('#ffffff', FACES[2]) },
  { src: faceTile('#fafafa', FACES[3]) },
  { src: faceTile('#171e19', FACES[4]) },
  { src: faceTile('#ffffff', FACES[5]) },
];

const HEADING_STYLE = {
  fontFamily: 'var(--ds-font-display)',
  fontSize: 'clamp(1.75rem, 6vw, 2.75rem)',
  lineHeight: 0.92,
  color: 'var(--ds-yellow)',
  letterSpacing: '-0.01em',
} as const;

const GALLERY_TILE_SIZE = 80;
const BROWSER_CONTENT_HEIGHT = 320;
// How long the loading state shows before the new page appears.
const BROWSER_PAGE_LOAD_DELAY = 1100;

// Deliberate loading-spinner transition for the fake-browser mockup's page
// switches, in place of an instant swap or crossfade - a plain two-path
// SMIL-animated ring (track + rotating arc), the same hand-styled inline-SVG
// pattern used everywhere else in this component (no spinner package
// needed for something this simple). `reason` swaps the caption depending
// on whether a human clicked the nav arrows or the mockup auto-advanced
// after sitting idle.
function BrowserPageLoader({ reason }: { reason: 'manual' | 'idle' }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2.5" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--ds-yellow)" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
          opacity=".25"
        />
        <path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z">
          <animateTransform
            attributeName="transform"
            type="rotate"
            dur="0.75s"
            values="0 12 12;360 12 12"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <span
        className="text-[9px] font-bold uppercase tracking-widest opacity-70"
        style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-yellow)' }}
      >
        {reason === 'idle' ? "Idle too long — switching pages" : 'Loading page…'}
      </span>
    </div>
  );
}

// Fake numbers for the browser mockup's "analytics" page - loosely modeled
// on chanhdai.com's Insights panel (stat cards + a visitors sparkline), but
// swapped for metrics that actually matter for this site (resume requests,
// not generic pageviews). Not wired to anything real - see the disclaimer
// rendered above these cards.
const ANALYTICS_STATS: { label: string; value: string; delta: string; trend: 'up' | 'down' | 'neutral'; bg: string }[] = [
  { label: 'Visitors (30d)', value: '2,481', delta: '+12.4%', trend: 'up', bg: 'var(--ds-sage)' },
  { label: 'Resumes requested', value: '37', delta: '+6 this month', trend: 'up', bg: 'var(--ds-yellow)' },
  { label: 'Approved', value: '24', delta: '65% of requests', trend: 'neutral', bg: '#ffffff' },
  { label: 'Rejected', value: '5', delta: '14% of requests', trend: 'neutral', bg: '#ffffff' },
];
// A fixed (not random) sequence so server and client render identical
// markup - Math.random() here would be a hydration mismatch.
const ANALYTICS_BAR_HEIGHTS = [35, 50, 40, 65, 55, 70, 60, 80, 45, 90, 75, 60, 85, 100];

// Cycles through the configurable job-title list on a timer. A single title
// just renders statically (no point animating something that never changes).
function JobTitleCycler({ titles }: { titles: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (titles.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % titles.length);
    }, 3000);
    return () => clearInterval(id);
  }, [titles.length]);

  return <span>{titles[index % titles.length]}</span>;
}

// Shared between the live homepage and the admin Settings preview dialog -
// a hand-copied mockup drifts from the real thing the moment either side
// changes, so this is the actual hero markup, parameterized on the fields
// Settings can edit.
const DEFAULT_JOB_TITLES = ['BACKEND / PLATFORM ENGINEER'];

export default function HeroSection({
  description,
  jobTitles = DEFAULT_JOB_TITLES,
  githubUrl,
  linkedinUrl,
  onRequestResume,
}: {
  description: string;
  jobTitles?: string[];
  githubUrl: string;
  linkedinUrl: string;
  onRequestResume: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  // Mirrors pageIndex for reads from setInterval callbacks (auto-advance
  // below) - safer than reading via a setState updater function purely as
  // a side-effecting getter, which isn't guaranteed to run exactly once
  // under React's Strict Mode.
  const pageIndexRef = useRef(0);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);
  // True while the deliberate loading spinner (BrowserPageLoader) is shown
  // between page switches - see goToPage below. pageLoadReason picks which
  // caption BrowserPageLoader shows.
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageLoadReason, setPageLoadReason] = useState<'manual' | 'idle'>('manual');
  const pageLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Fewer decorative face tiles on very narrow screens - a safety margin on
  // top of GravityGallery's own wall-resize fix, so the pile has less
  // chance of needing to stack taller than the mockup's fixed mobile height
  // even before that fix kicks in. GitHub/LinkedIn are real links, so they
  // stay regardless of width.
  const [narrowGallery, setNarrowGallery] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 380px)');
    const update = () => setNarrowGallery(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // The GitHub/LinkedIn tiles only exist in the gallery when those links are
  // actually configured - same isConfigured() gate as the real buttons above.
  const galleryImages = [
    ...(isConfigured(githubUrl)
      ? [{ src: svgTile('#171e19', `<g transform="translate(8,8) scale(2)"><path d="${GITHUB_PATH}" fill="#fff"/></g>`), href: formatUrl(githubUrl) }]
      : []),
    ...(isConfigured(linkedinUrl)
      ? [{ src: svgTile('#0a66c2', `<g transform="translate(8,8) scale(2)"><path d="${LINKEDIN_PATH}" fill="#fff"/></g>`), href: formatUrl(linkedinUrl) }]
      : []),
    ...(narrowGallery ? GALLERY_FACE_IMAGES.slice(0, 3) : GALLERY_FACE_IMAGES),
  ];

  // Pages the fake browser mockup below cycles through via its header's
  // arrow buttons - add more entries here and the nav just works, no other
  // wiring needed.
  const browserPages = [
    {
      path: 'socials',
      content: (
        // Fills the content area edge-to-edge - no gutter around the stage.
        // (A black-padding version of this used to sit here, matching the
        // pulled Claude Design template's own framing, but at this box's
        // size the gutter just read as a rendering gap next to the mockup's
        // own drop shadow, not as a deliberate frame.)
        <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0 0 0.65rem 0.65rem' }}>
          {/* Backdrop poster - sits behind the physics tiles (no z-index of
              its own, so GravityGallery's own root, later in DOM order,
              naturally paints on top; pointer-events:none so it never
              intercepts the drag). */}
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            <div
              className="shrink-0 flex items-center justify-between px-4"
              style={{ height: 38, borderBottom: '3px solid #000', backgroundColor: 'var(--ds-sage)' }}
            >
              <span className="font-extrabold text-sm tracking-wide" style={{ fontFamily: 'var(--ds-font-display)' }}>SOCIALS.</span>
              <span className="font-bold text-[10px] tracking-widest opacity-65" style={{ fontFamily: 'var(--ds-font-display)' }}>
                ABOUT&nbsp;&nbsp;WORK&nbsp;&nbsp;CONTACT
              </span>
            </div>
            <div className="relative flex-1 overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
              <div className="flex flex-col items-center">
                <div className="font-extrabold text-center uppercase" style={HEADING_STYLE}>
                  LET&apos;S<br />CONNECT
                </div>
                {/* Same layer as the heading above (part of the backdrop,
                    behind the tiles) - it's fine for a tile to land on top
                    of this exactly like a tile can land on top of the
                    heading text itself; that's the existing, accepted
                    behavior here, not something this hint needs to be
                    exempt from. */}
                {/* Both rows below share identical fixed-width slots for the
                    label and the arrow (68px / 30px), each centered/aligned
                    the same way regardless of that row's own icon or text -
                    "click me"/"toss me" are 8 vs 7 characters and the two
                    arrow icons are 30px vs 22px, so relying on natural
                    content width left the second row's tile sitting a few
                    px off from the first row's - not from the tile's own
                    rotation, from the row's cumulative width before it. */}
                <div className="mt-3 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className="font-bold text-xs uppercase tracking-widest inline-block"
                      style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-yellow)', width: 68, textAlign: 'right' }}
                    >
                      click me
                    </span>
                    <span className="inline-flex items-center justify-center" style={{ width: 30 }}>
                      <svg width="30" height="12" viewBox="0 0 30 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="6" x2="22" y2="6" stroke="#ffe17c" strokeWidth="2" strokeLinecap="round" />
                        <path d="M18 1 L24 6 L18 11" stroke="#ffe17c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1.5" y="1.5" width="25" height="25" rx="5" stroke="#ffe17c" strokeWidth="1.5" />
                      <circle cx="14" cy="14" r="8" stroke="#ffe17c" strokeWidth="1.5" />
                      <path d="M10.5 12.5h1.8M15.7 12.5h1.8" stroke="#ffe17c" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M10.3 17q3.7 3 7.4 0" stroke="#ffe17c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className="font-bold text-xs uppercase tracking-widest inline-block"
                      style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-yellow)', width: 68, textAlign: 'right' }}
                    >
                      toss me
                    </span>
                    <span className="inline-flex items-center justify-center" style={{ width: 30 }}>
                      <RotateCw className="w-[22px] h-[22px]" style={{ color: '#ffe17c' }} strokeWidth={2} aria-hidden="true" />
                    </span>
                    {/* Rotation lives on an inner element inside a fixed,
                        unrotated 28x28 anchor box - so the tile's optical
                        center stays pinned to the exact same spot as the
                        unrotated "click me" tile directly above it, instead
                        of drifting off-column the way rotating the sized
                        element itself would (a rotated square's bounding
                        box grows past its own layout box). */}
                    <span className="inline-flex items-center justify-center" style={{ width: 28, height: 28 }}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ transform: 'rotate(-14deg)', transformOrigin: '50% 50%' }}
                      >
                        <rect x="1.5" y="1.5" width="25" height="25" rx="5" stroke="#ffe17c" strokeWidth="1.5" />
                        <circle cx="14" cy="14" r="8" stroke="#ffe17c" strokeWidth="1.5" />
                        <path d="M10.5 12.5h1.8M15.7 12.5h1.8" stroke="#ffe17c" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M10.3 17q3.7 3 7.4 0" stroke="#ffe17c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="shrink-0 flex items-center justify-between px-4"
              style={{ height: 32, borderTop: '3px solid #000', backgroundColor: 'var(--ds-sage)' }}
            >
              <span className="font-bold text-[10px] tracking-wide opacity-60" style={{ fontFamily: 'var(--ds-font-display)' }}>&copy; SOCIALS</span>
              <span className="font-extrabold text-[10px] tracking-wide" style={{ fontFamily: 'var(--ds-font-display)' }}>SCROLL &darr;</span>
            </div>
          </div>
          <GravityGallery images={galleryImages} count={galleryImages.length} size={GALLERY_TILE_SIZE} shape="square" />
        </div>
      ),
    },
    {
      path: 'analytics',
      content: (
        <div className="p-3 h-full overflow-hidden flex flex-col gap-2" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
          {/* Explicit, can't-miss disclaimer - these numbers are made up for
              the mockup, not pulled from anything real. */}
          <div
            className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 border-2"
            style={{ borderColor: 'var(--ds-yellow)', borderStyle: 'dashed', borderRadius: '0.4rem' }}
          >
            <span className="text-xs leading-none shrink-0">&#9888;&#65039;</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wide leading-tight"
              style={{ color: 'var(--ds-yellow)', fontFamily: 'var(--ds-font-display)' }}
            >
              Sample data &mdash; not wired up yet
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            {ANALYTICS_STATS.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-black p-2"
                style={{ backgroundColor: stat.bg, borderRadius: '0.5rem' }}
              >
                <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5 opacity-70">{stat.label}</p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <p className="text-base font-extrabold" style={{ fontFamily: 'var(--ds-font-display)' }}>{stat.value}</p>
                  <span
                    className="text-[9px] font-bold whitespace-nowrap"
                    style={{ color: stat.trend === 'up' ? '#166534' : stat.trend === 'down' ? '#991b1b' : 'rgba(0,0,0,0.5)' }}
                  >
                    {stat.trend === 'up' ? '↑ ' : stat.trend === 'down' ? '↓ ' : ''}
                    {stat.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 border-2 border-black bg-white p-2 flex flex-col" style={{ borderRadius: '0.5rem' }}>
            <p className="text-[8px] font-bold uppercase tracking-wider mb-1 opacity-60 shrink-0">Visitors &mdash; last 14 days</p>
            <div className="flex-1 min-h-0 flex items-end gap-1">
              {ANALYTICS_BAR_HEIGHTS.map((h, i) => (
                <div key={i} className="flex-1 bg-black" style={{ height: `${h}%`, borderRadius: '1px 1px 0 0' }} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];
  const page = browserPages[pageIndex];

  // Switches pages via a brief loading state instead of an instant swap -
  // shows BrowserPageLoader for BROWSER_PAGE_LOAD_DELAY ms, then reveals
  // the new page. Used by the nav arrows and auto-advance alike; `reason`
  // just picks which caption is shown.
  const goToPage = useCallback((newIndex: number, reason: 'manual' | 'idle' = 'manual') => {
    setPageLoadReason(reason);
    setIsPageLoading(true);
    if (pageLoadTimeoutRef.current) clearTimeout(pageLoadTimeoutRef.current);
    pageLoadTimeoutRef.current = setTimeout(() => {
      setPageIndex(newIndex);
      setIsPageLoading(false);
    }, BROWSER_PAGE_LOAD_DELAY);
  }, []);
  useEffect(() => {
    return () => {
      if (pageLoadTimeoutRef.current) clearTimeout(pageLoadTimeoutRef.current);
    };
  }, []);

  // Auto-advance the mockup to the next page after 15s of no interaction.
  // "Interaction" is the whole mockup, not just the nav arrows - dragging a
  // gallery tile around is exactly the kind of interaction this shouldn't
  // interrupt. While the pointer is anywhere over the mockup the timer is
  // paused outright (not just reset), same as the "REAL" word's hover
  // behavior; leaving restarts a fresh 15s.
  //
  // This is tracked via a capture-phase `pointermove`/`pointerdown` listener
  // on window, checked against the mockup's own getBoundingClientRect(),
  // rather than React's onMouseEnter/onMouseLeave on the wrapper - GravityGallery
  // wires Matter.js's own Mouse.create() directly onto its container for
  // drag physics, which attaches native listeners that stop the event from
  // ever reaching an ancestor's React-synthetic handlers. A capture-phase
  // window listener sees every pointer event first, before anything
  // downstream (including Matter.js's own handlers) can swallow it.
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isMockupHoveredRef = useRef(false);
  const mockupRef = useRef<HTMLDivElement>(null);
  const resetAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(() => {
      goToPage((pageIndexRef.current + 1) % browserPages.length, 'idle');
    }, 15000);
  }, [browserPages.length, goToPage]);
  const pauseAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
  }, []);
  useEffect(() => {
    resetAutoAdvance();
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [resetAutoAdvance]);
  useEffect(() => {
    // Listens for both Pointer and legacy Mouse events - belt-and-suspenders
    // for any context that only fires one family (some embedded webviews,
    // automated test drivers, etc.), not just the primary mechanism.
    const handlePointerActivity = (e: MouseEvent | PointerEvent) => {
      const el = mockupRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        isMockupHoveredRef.current = true;
        pauseAutoAdvance();
      } else if (isMockupHoveredRef.current) {
        isMockupHoveredRef.current = false;
        resetAutoAdvance();
      }
    };
    window.addEventListener('pointermove', handlePointerActivity, true);
    window.addEventListener('pointerdown', handlePointerActivity, true);
    window.addEventListener('mousemove', handlePointerActivity, true);
    window.addEventListener('mousedown', handlePointerActivity, true);
    return () => {
      window.removeEventListener('pointermove', handlePointerActivity, true);
      window.removeEventListener('pointerdown', handlePointerActivity, true);
      window.removeEventListener('mousemove', handlePointerActivity, true);
      window.removeEventListener('mousedown', handlePointerActivity, true);
    };
  }, [pauseAutoAdvance, resetAutoAdvance]);

  return (
    <section className="relative border-b-2 border-black overflow-hidden" style={{ backgroundColor: 'var(--ds-yellow)' }}>
      <ReactiveGrid
        shape="circle"
        fill="solid"
        particleColor="rgba(0,0,0,0.25)"
        backgroundColor="#ffe17c"
        minSize={4}
        maxSize={10}
        gap={25}
        influence={75}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 sm:py-28 grid lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto] gap-x-14 items-center lg:items-stretch">
        {jobTitles.some((t) => t.trim()) && (
          <span
            className="lg:row-start-1 lg:col-start-1 inline-flex items-center gap-2 justify-self-center lg:justify-self-start px-4 py-1.5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-xs font-bold mb-6"
            style={{ borderRadius: '0.75rem' }}
          >
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <JobTitleCycler titles={jobTitles.filter((t) => t.trim())} />
          </span>
        )}

        {/* Heading + description share this row with the mockup - the
            mockup's height (see lg:h-full below) stretches to match
            whatever this block naturally renders at, so the badge and
            button above/below stay outside the height it's matched to. */}
        <div className="lg:row-start-2 lg:col-start-1 text-center lg:text-left">
          <h1
            className="text-black mb-6"
            style={{
              fontFamily: 'var(--ds-font-display)',
              fontSize: 'clamp(2.5rem, 7vw, 6rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
            }}
          >
            CHIN YI ZHE
            <br />
            BUILDS
            <br />
            <span
              className="inline-block align-middle"
              style={{ width: 'fit-content', height: '1em', marginLeft: -32, overflow: 'visible', position: 'relative' }}
            >
              <CrystalGlow
                text="REAL"
                fontFamily="var(--ds-font-display)"
                fontWeight={800}
                fontSize="clamp(2.5rem, 7vw, 6rem)"
                textColor="#ffffff"
                shadowColor="#000000"
                glareColor="rgba(255,255,255,0.85)"
                autoBlink
                autoBlinkInterval={15000}
              />
              {/* Discoverability hint - autoBlink above is a nice-to-have for
                  browsers where it renders correctly, but hovering is the one
                  interaction guaranteed to work everywhere, so it's called out
                  directly instead of relying on a passerby noticing on their
                  own. Hidden below sm: the heading is centered and tight on
                  mobile, no good spot for an inline aside there. Pinned to
                  the word's top-right corner via absolute positioning rather
                  than flowing inline. An asterisk prefix instead of an arrow -
                  the curved arrow never read as pointing at the word cleanly. */}
              <span
                className="hidden sm:flex items-center gap-1.5"
                style={{ position: 'absolute', top: 0, left: '100%', marginLeft: -24 }}
              >
                <span
                  aria-hidden="true"
                  className="font-extrabold"
                  style={{ fontFamily: 'var(--ds-font-display)', color: 'rgba(0,0,0,0.7)', fontSize: '1rem', lineHeight: 1 }}
                >
                  *
                </span>
                <span
                  className="font-bold text-xs uppercase tracking-widest whitespace-nowrap"
                  style={{ fontFamily: 'var(--ds-font-display)', color: 'rgba(0,0,0,0.7)' }}
                >
                  hover me, i blink
                </span>
              </span>
            </span>
            <br />
            SYSTEMS.
          </h1>

          <p className="text-lg font-medium max-w-md mx-auto lg:mx-0 mb-8">
            {description}
          </p>
        </div>

        <div className="lg:row-start-3 lg:col-start-1 flex flex-wrap gap-4 justify-center lg:justify-start">
          <button
            onClick={onRequestResume}
            data-cursor-label="Request"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-black font-bold border-2 border-black shadow-[4px_8px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            style={{ borderRadius: '0.75rem' }}
          >
            <FileDown className="w-4 h-4" aria-hidden="true" />
            Request resume
          </button>
        </div>

        {/* Browser mockup - real stack info, not fabricated charts/revenue.
            Purely aesthetic chrome (traffic lights, address bar) around a
            small set of swipeable "pages"; nothing here fetches or
            navigates anywhere. Pinned to row 2 (see lg:grid-rows above) so
            its lg:h-full only stretches to match the heading+description
            block beside it, not the badge or button too. */}
        <div
          ref={mockupRef}
          className="mt-14 lg:mt-0 lg:col-start-2 lg:row-start-2 bg-white border-2 border-black shadow-[12px_12px_0px_0px_#000] lg:h-full lg:flex lg:flex-col"
          style={{ borderRadius: '0.75rem' }}
        >
          <div className="bg-black lg:shrink-0" style={{ borderRadius: '0.6rem 0.6rem 0 0' }}>
            <div className="h-9 flex items-center gap-1.5 px-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
            </div>
            <div className="flex items-center gap-1.5 px-3 pb-2.5">
              <button
                type="button"
                onClick={() => {
                  goToPage((pageIndex - 1 + browserPages.length) % browserPages.length);
                  resetAutoAdvance();
                }}
                aria-label="Previous page"
                data-cursor-label="Prev"
                className="w-6 h-6 shrink-0 flex items-center justify-center text-white/60 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  goToPage((pageIndex + 1) % browserPages.length);
                  resetAutoAdvance();
                }}
                aria-label="Next page"
                data-cursor-label="Next"
                className="w-6 h-6 shrink-0 flex items-center justify-center text-white/60 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <div
                className="flex-1 h-6 min-w-0 bg-white/10 flex items-center gap-1.5 px-2.5 text-[11px] font-mono text-white/50 truncate"
                style={{ borderRadius: '0.35rem' }}
              >
                <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{page.path}</span>
              </div>
            </div>
          </div>
          <div style={{ height: BROWSER_CONTENT_HEIGHT }} className="overflow-hidden lg:!h-auto lg:flex-1">
            {isPageLoading ? <BrowserPageLoader reason={pageLoadReason} /> : page.content}
          </div>
        </div>
      </div>
    </section>
  );
}
