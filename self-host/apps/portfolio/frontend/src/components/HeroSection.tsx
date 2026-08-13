'use client';
import { useEffect, useState } from 'react';
import { FileDown, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
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

// Shared between the live homepage and the admin Settings preview dialog -
// a hand-copied mockup drifts from the real thing the moment either side
// changes, so this is the actual hero markup, parameterized on the fields
// Settings can edit.
export default function HeroSection({
  description,
  githubUrl,
  linkedinUrl,
  onRequestResume,
}: {
  description: string;
  githubUrl: string;
  linkedinUrl: string;
  onRequestResume: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);

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
                <div className="mt-3 flex items-center gap-2 whitespace-nowrap">
                  <span
                    className="font-bold text-xs uppercase tracking-widest"
                    style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-yellow)' }}
                  >
                    click me
                  </span>
                  <svg width="30" height="12" viewBox="0 0 30 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="6" x2="22" y2="6" stroke="#ffe17c" strokeWidth="2" strokeLinecap="round" />
                    <path d="M18 1 L24 6 L18 11" stroke="#ffe17c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1.5" y="1.5" width="25" height="25" rx="5" stroke="#ffe17c" strokeWidth="1.5" />
                    <circle cx="14" cy="14" r="8" stroke="#ffe17c" strokeWidth="1.5" />
                    <path d="M10.5 12.5h1.8M15.7 12.5h1.8" stroke="#ffe17c" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M10.3 17q3.7 3 7.4 0" stroke="#ffe17c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </svg>
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
      path: 'tech-stack',
      content: (
        <div className="p-6 space-y-3">
          <div className="border-2 border-black p-4" style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Stack</p>
            <p className="text-sm font-medium">Go &middot; Next.js &middot; Docker</p>
          </div>
          <div className="border-2 border-black p-4" style={{ backgroundColor: 'var(--ds-yellow)', borderRadius: '0.5rem' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Hosting</p>
            <p className="text-sm font-medium">Self-hosted, own hardware</p>
          </div>
          <div className="border-2 border-black p-4 bg-white" style={{ borderRadius: '0.5rem' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Build process</p>
            <p className="text-sm font-medium">AI-assisted, documented end to end</p>
          </div>
        </div>
      ),
    },
  ];
  const page = browserPages[pageIndex];

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
        <span
          className="lg:row-start-1 lg:col-start-1 inline-flex items-center justify-self-center lg:justify-self-start px-4 py-1.5 bg-white border-2 border-black text-xs font-bold mb-6"
          style={{ borderRadius: '0.75rem' }}
        >
          BACKEND / PLATFORM ENGINEER
        </span>

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
              style={{ width: 'fit-content', height: '1em', marginLeft: -32, overflow: 'visible' }}
            >
              <CrystalGlow
                text="REAL"
                fontFamily="var(--ds-font-display)"
                fontWeight={800}
                fontSize="clamp(2.5rem, 7vw, 6rem)"
                textColor="#ffffff"
                shadowColor="#000000"
                glareColor="rgba(255,255,255,0.85)"
              />
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
        <div className="mt-14 lg:mt-0 lg:col-start-2 lg:row-start-2 bg-white border-2 border-black shadow-[12px_12px_0px_0px_#000] lg:h-full lg:flex lg:flex-col" style={{ borderRadius: '0.75rem' }}>
          <div className="bg-black lg:shrink-0" style={{ borderRadius: '0.6rem 0.6rem 0 0' }}>
            <div className="h-9 flex items-center gap-1.5 px-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
            </div>
            <div className="flex items-center gap-1.5 px-3 pb-2.5">
              <button
                type="button"
                onClick={() => setPageIndex((i) => (i - 1 + browserPages.length) % browserPages.length)}
                aria-label="Previous page"
                data-cursor-label="Prev"
                className="w-6 h-6 shrink-0 flex items-center justify-center text-white/60 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((i) => (i + 1) % browserPages.length)}
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
            {page.content}
          </div>
        </div>
      </div>
    </section>
  );
}
