'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HeroSection from '@/components/HeroSection';
import ProjectRow, { type Project as ProjectRowType } from '@/components/ProjectRow';
import EmptyProjectCard from '@/components/EmptyProjectCard';
import BlogCard from '@/components/BlogCard';
import EmptyBlogCard from '@/components/EmptyBlogCard';
import CopySectionLinkButton from '@/components/CopySectionLinkButton';
import { useResumeRequest } from '@/components/ResumeRequestModal';
import { fetchJson } from '@/lib/fetch-json';
import { estimateReadingMinutes } from '@/lib/reading-time';
import ParticleImage from '@/components/originkit/svgparticles';

type Project = ProjectRowType & { featured: boolean };

type Post = {
  id: string;
  title: string;
  source_type: string;
  content: string;
  cover_image_url: string;
  published_date: string;
  featured: boolean;
  love_count: number;
  view_count: number;
};

type CreditItem = { text: string; url: string };
type CreditRow = { id: string; label: string; items: CreditItem[] };

// User-supplied train glyph (train-svgrepo-com), used verbatim - the source
// file's outer path is a viewBox-bounding square combined with a few
// microscopic decorative sub-paths near y~23, but it inherits fill="none"
// from the original file's ancestor <g>, so it never paints; only the
// second, explicitly-filled path (the actual train silhouette) renders.
// Height is a prop rather than baked in so callers can size it exactly
// (in px or a clamp() string) to match whatever wordmark sits next to it.
function WorkTogetherTrainLogo({ height }: { height: number | string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ height, width: height, flexShrink: 0 }}>
      <path
        fill="#09244B"
        d="M21,18 C21.5523,18 22,18.4477 22,19 C22,19.5523 21.5523,20 21,20 L2,20 C1.44772,20 1,19.5523 1,19 C1,18.4477 1.44772,18 2,18 L21,18 Z M12,5 C15.2244,5 17.9419,6.07548 19.8678,7.58868 C21.7592,9.07478 23,11.0853 23,13 C23,13.8416 22.7418,14.5605 22.2869,15.1406 C21.8436,15.7058 21.2528,16.0903 20.6508,16.3537 C19.4652,16.8724 18.0539,17 17,17 L2.99376,17 C1.88106,17 1,16.0964 1,15 L1,7 C1,5.89867 1.88971,5 2.99752,5 L12,5 Z M7,7 L3,7 L3,10 L7,10 L7,7 Z M12,7 L9,7 L9,10 L13,10 L13,7.04071 C12.7829333,7.02287 12.5623556,7.01072333 12.3384148,7.00460778 L12,7 Z M15,7.38297 L15,10 L19.5514,10 C19.2835,9.7142 18.9774,9.43256 18.6322,9.16132 C17.6698,8.40519 16.4427,7.76577 15,7.38297 Z"
      />
    </svg>
  );
}

// Rotating "destinations" for the work-together ticket - purely decorative
// ticket-realism (coordinates/date/price/departure text, plus the actual
// destination photo DestinationParticles renders as a particle field). The
// photos live in public/destinations/ - real photography, not a hand-drawn
// approximation, per an explicit correction mid-session: an earlier version
// of this used hand-authored SVG silhouettes for an anime.js morphTo
// animation, which the operator rejected outright ("use the pngs directly").
// Capped at 4 cities to keep the ticket's footer text readable.
const WORK_TOGETHER_DESTINATIONS = [
  {
    name: 'PARIS',
    coords: '48.8566° N, 2.3522° E',
    date: '18 MAY',
    price: '$860',
    departure: '11:47',
    photo: '/destinations/paris.png',
  },
  {
    name: 'KUALA LUMPUR',
    coords: '3.1390° N, 101.6869° E',
    date: '07 JUN',
    price: '$720',
    departure: '16:05',
    photo: '/destinations/kuala-lumpur.png',
  },
  {
    name: 'TOKYO',
    coords: '35.6762° N, 139.6503° E',
    date: '02 APR',
    price: '$980',
    departure: '09:15',
    photo: '/destinations/tokyo.png',
  },
  {
    name: 'ROME',
    coords: '41.9028° N, 12.4964° E',
    date: '22 JUL',
    price: '$910',
    departure: '13:20',
    photo: '/destinations/rome.png',
  },
];

// How often the ticket's destination rotates - also doubles as the duration
// of the RouteMotionLine "travel" animation below, so one full trip along
// the line takes exactly as long as one destination holds.
const WORK_TOGETHER_ROTATION_MS = 7000;

// Generated client-side only (see the useEffect below) so the server-rendered
// markup has a stable placeholder and hydration never has to reconcile a
// random value against itself.
function generateTicketId() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  const year = new Date().getFullYear();
  return `T${digits}X${year}`;
}

// Fixed (not random) bar widths for the footer barcode - Math.random() here
// would be a hydration mismatch between server and client render, same
// reasoning as HeroSection's ANALYTICS_BAR_HEIGHTS.
const WORK_TOGETHER_BARCODE_WIDTHS = [2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 1, 3];

// Crossfades a footer field's value on every destIndex change instead of
// snapping - wraps children in a fresh key so AnimatePresence treats each
// rotation as an exit/enter pair.
function WorkTogetherFieldValue({ destIndex, style, children }: { destIndex: number; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={destIndex}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.3 }}
        style={style}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

// Push-button "sink in" affordance - shadow present at rest, removed on
// hover, element nudged straight down (vertical-only, not diagonal like
// ResumeRequestModal's pushBtn) into where the yellow shadow was.
const workTogetherPushBtn =
  'transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-y-1 disabled:hover:translate-y-0';

// `width`/`height` set the viewBox's internal proportions (bar-width math
// only) - actual rendered size is driven entirely by the wrapping element's
// own CSS box (width="100%" height="100%" + preserveAspectRatio="none"
// below), so a caller that gives this a stretched/definite-height wrapper
// gets a barcode that exactly fills it, no matter what pixel size the
// ticket happens to render at. Callers that just want a fixed pixel size
// can wrap it in a div with that explicit width/height instead.
function WorkTogetherBarcode({ width, height, color }: { width: number; height: number; color: string }) {
  const bars = WORK_TOGETHER_BARCODE_WIDTHS;
  const gap = 1.5;
  const totalUnits = bars.reduce((sum, w) => sum + w, 0) + gap * (bars.length - 1);
  const scale = width / totalUnits;
  const offsets = bars.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + bars[i - 1] * scale + gap * scale);
    return acc;
  }, []);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {bars.map((w, i) => (
        <rect key={i} x={offsets[i]} y={0} width={w * scale} height={height} fill={color} />
      ))}
    </svg>
  );
}

// Renders the rotating destination's actual photo as a particle field via
// the verbatim OriginKit "SVG Particle" component (src/components/originkit/
// svgparticles.tsx - fetched via `originkit: get svgparticles` and wired in
// unmodified, not rewritten). Two things needed layering on top without
// touching that file:
//
// 1. Repulsion off, hover-driven reassembly on - but triggered by us on
//    every destIndex change, never by the visitor's actual cursor. The
//    component only exposes that state machine through its own
//    onMouseMove/onMouseLeave handlers on its internal <canvas> - there's no
//    prop or ref to trigger it externally. Rather than fork the component,
//    `pointer-events: none` on the wrapper stops the browser from ever
//    generating *real* mouse events for it (CSS pointer-events only gates
//    hit-testing, not JS-dispatched events), then this component finds that
//    canvas via DOM query and dispatches synthetic mousemove/mouseleave at
//    it - same code path the component would run for a genuine hover, just
//    driven by our timer instead of the visitor's mouse.
// 2. The scatter/reassemble cadence: on a destIndex change, dispatch
//    mouseleave first (scatters/hides the outgoing photo's particles per
//    hoverConfig.hoverType: 'hide'), swap the image src once that transition
//    finishes (the component's own effect rebuilds particles from the new
//    image), then dispatch mousemove to reassemble it into view.
const DESTINATION_PARTICLE_TRANSITION_MS = 800;
// A permanent heartbeat, not a one-shot or bounded-retry trigger. The
// vendored component (re)builds its particle scene asynchronously (decodes
// the image, samples pixels into particles) and its own ResizeObserver /
// image-load callback unconditionally resets the animation state back to
// hidden whenever either fires - which can land well after any single
// synthetic mousemove (or even a several-second retry window) and silently
// undo it; that race got easy to lose once particleCount went up (slower
// decode). Re-asserting "hovered" every 250ms for the component's entire
// lifetime sidesteps the race outright: however many times its internal
// state gets reset, the next tick re-triggers assembly. Once it's actually
// showing the image, the extra dispatches are harmless no-ops (its state
// machine only reacts to mousemove while idle/scattering). `revealingRef`
// pauses the heartbeat during the deliberate scatter-then-swap window below
// so it doesn't fight that transition.
const DESTINATION_PARTICLE_HEARTBEAT_MS = 250;

// Marks a dispatched event so the document-level interceptor below (and
// only that interceptor) recognizes it as ours.
type SyntheticHoverEvent = MouseEvent & { __destinationParticleSynthetic?: true };

function dispatchDestinationHover(canvas: HTMLCanvasElement, type: 'mousemove' | 'mouseleave') {
  const rect = canvas.getBoundingClientRect();
  const evt: SyntheticHoverEvent = new MouseEvent(type, {
    bubbles: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  });
  evt.__destinationParticleSynthetic = true;
  canvas.dispatchEvent(evt);
}

function DestinationParticles({ index }: { index: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(index);
  const revealingRef = useRef(true);
  const [photo, setPhoto] = useState(WORK_TOGETHER_DESTINATIONS[index].photo);

  // The site-wide custom cursor (UserCursor, also a verbatim OriginKit
  // component) tracks the real cursor via a window.addEventListener
  // ("mousemove", ...) - and our synthetic hover events above have to
  // bubble for React to see them at all (confirmed directly: a
  // non-bubbling dispatch never reaches React's delegated root listener
  // either). Left alone, those bubbling synthetic events also reach that
  // window listener and visibly drag the custom cursor onto this canvas
  // even though the visitor's actual mouse never moved - the bug reported
  // here. `document` sits between React's root and `window` in the bubble
  // chain, so a bubble-phase listener there that calls stopPropagation()
  // only for events carrying our marker cuts them off after React has
  // already processed them but before they'd reach `window` - confirmed by
  // directly counting window's mousemove events with and without this
  // interceptor in place. Untagged (real user) events pass through
  // untouched, so the custom cursor keeps tracking the visitor normally.
  useEffect(() => {
    const interceptor = (e: Event) => {
      if ((e as SyntheticHoverEvent).__destinationParticleSynthetic) e.stopPropagation();
    };
    document.addEventListener('mousemove', interceptor);
    document.addEventListener('mouseleave', interceptor);
    return () => {
      document.removeEventListener('mousemove', interceptor);
      document.removeEventListener('mouseleave', interceptor);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!revealingRef.current) return;
      const canvas = wrapRef.current?.querySelector('canvas');
      if (canvas) dispatchDestinationHover(canvas, 'mousemove');
    }, DESTINATION_PARTICLE_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (index === prevIndexRef.current) return;
    prevIndexRef.current = index;
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    let cancelled = false;
    revealingRef.current = false;
    dispatchDestinationHover(canvas, 'mouseleave');
    const timer = setTimeout(() => {
      if (cancelled) return;
      setPhoto(WORK_TOGETHER_DESTINATIONS[index].photo);
      revealingRef.current = true;
    }, DESTINATION_PARTICLE_TRANSITION_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [index]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%', height: '100%', pointerEvents: 'none',
        // The panel now overlaps the text column on its left side (see the
        // comment where this component is placed), so its own left edge
        // fades to transparent - revealing the charcoal panel bg (and the
        // text sitting on it) underneath - instead of sitting solid over
        // the words. Fully opaque again well before the panel's right edge,
        // so the photo still reads clearly near the dashed divider.
        maskImage: 'linear-gradient(to right, transparent 0%, black 45%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)',
      }}
    >
      {/* No `mode: 'fit'` on imageConfig below - that's the component's
          aspect-preserving contain sizing, which letterboxes any photo
          whose aspect ratio doesn't match this panel (only Paris happened
          to line up). Omitting `mode` falls back to its percentage-sizing
          path, which defaults to widthPct/heightPct 100 - a
          non-aspect-preserving stretch to fill the container exactly, so
          every photo touches all four edges the same way regardless of its
          native shape. */}
      <ParticleImage
        imageConfig={{ image: photo, widthPct: 100, heightPct: 100 }}
        particleCount={75}
        particleSize={1}
        particleColor="original"
        hoverEnabled
        hoverConfig={{ hoverType: 'hide', transition: { duration: 0.8, ease: 'easeInOut' }, hideType: 'scatter' }}
        repulsionEnabled={false}
        width="100%"
        height="100%"
      />
    </div>
  );
}

// Decorative separator between the "Let's talk" heading and the "Direct
// line" tagline - a small marker travels the dashed line via anime.js v4's
// svg.createMotionPath (https://animejs.com/documentation/svg/createmotionpath),
// which returns translateX/translateY/rotate tweens mapped to the target
// path's geometry so the marker actually follows it rather than just
// sliding in a straight CSS translate. Loops continuously at durationMs per
// pass - the caller passes WORK_TOGETHER_ROTATION_MS so one trip along the
// line takes exactly as long as one destination holds, tying the "we're
// travelling" motion to the same cadence as the destination swap. Runs
// client-side only via a dynamic import, same reasoning as DestinationMorph.
function RouteMotionLine({ durationMs }: { durationMs: number }) {
  const lineRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!lineRef.current || !markerRef.current) return;
    let cancelled = false;
    import('animejs').then(({ animate, svg }) => {
      if (cancelled || !lineRef.current || !markerRef.current) return;
      animate(markerRef.current, {
        ease: 'linear',
        duration: durationMs,
        loop: true,
        ...svg.createMotionPath(lineRef.current),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [durationMs]);

  // viewBox starts at x=-4, not 0: the first dot (cx=0, r=4) would
  // otherwise bleed 4 units left of the box's own edge (overflow:visible
  // was masking that, not fixing it), making the line visibly start left
  // of the "Direct line" text below despite both sitting at the same
  // container edge. Starting the viewBox exactly at the dot's own left
  // extent puts its leftmost pixel flush with the box boundary, which
  // lines up with the text.
  return (
    <svg width="320" height="30" viewBox="-4 0 320 30" aria-hidden="true" style={{ width: 'clamp(160px, 22cqw, 260px)', height: 'auto', overflow: 'visible' }}>
      <path ref={lineRef} d="M0,9 L320,9" fill="none" stroke="var(--ds-yellow)" strokeWidth="2" strokeDasharray="2 6" />
      {[
        { x: 0, label: '0KM' },
        { x: 160, label: '150KM' },
        { x: 320, label: '300KM' },
      ].map((stop) => (
        <g key={stop.label}>
          <circle cx={stop.x} cy={9} r={4} fill="var(--ds-yellow)" />
          <text
            x={stop.x}
            y={24}
            textAnchor="middle"
            style={{ font: '700 8px var(--font-mono)', fill: 'rgba(255,225,124,0.55)', letterSpacing: '0.04em' }}
          >
            {stop.label}
          </text>
        </g>
      ))}
      <circle ref={markerRef} r="3.5" fill="var(--ds-charcoal)" stroke="var(--ds-yellow)" strokeWidth="1.5" />
    </svg>
  );
}

export default function Home() {
  const { open: openResumeRequest } = useResumeRequest();
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);

  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');
  const [heroDescription, setHeroDescription] = useState<string>('');
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  // "Interested in working together?" form - replaces the old inline
  // Credits band (credits now live as their own page in the fake browser
  // mockup, see HeroSection). Posts straight to the public /api/leads
  // endpoint; no dialog since it already sits inline on the page.
  const [leadForm, setLeadForm] = useState({ name: '', email: '', message: '' });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState('');

  // Rotates the ticket's "destination" (coordinates/date/price/departure
  // text + the DestinationMorph landmark silhouette) through
  // WORK_TOGETHER_DESTINATIONS on a timer, same cadence family as the hero
  // job-title badge.
  const [destIndex, setDestIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDestIndex((i) => (i + 1) % WORK_TOGETHER_DESTINATIONS.length), WORK_TOGETHER_ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  // Ticket ID - purely decorative, generated once per mount (not tied to
  // destIndex - it's meant to read as "this booking's" ID, not
  // per-destination). The lazy initializer runs once on both server and
  // client, so the two renders necessarily disagree - every element that
  // displays it needs suppressHydrationWarning since that mismatch is
  // expected, not a bug.
  const [ticketId] = useState(() => generateTicketId());

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSubmitting(true);
    setLeadError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm),
      });
      if (res.ok) {
        setLeadSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setLeadError(data?.error || "Couldn't send that. Try again in a moment.");
      }
    } catch (err) {
      console.error(err);
      setLeadError('Network error. Check your connection and try again.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  useEffect(() => {
    const loadOtherData = async () => {
      try {
        const [configRes, projectsRes, postsRes, creditsRes] = await Promise.allSettled([
          fetchJson<{ resumeUrl?: string; linkedinUrl?: string; githubUrl?: string; heroDescription?: string; jobTitles?: string[] }>('/api/config'),
          fetchJson<Project[]>('/api/projects'),
          fetchJson<Post[]>('/api/posts'),
          fetchJson<CreditRow[]>('/api/credits'),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value) {
          if (configRes.value.linkedinUrl) setLinkedinUrl(configRes.value.linkedinUrl);
          if (configRes.value.githubUrl) setGithubUrl(configRes.value.githubUrl);
          if (configRes.value.heroDescription) setHeroDescription(configRes.value.heroDescription);
          if (Array.isArray(configRes.value.jobTitles)) setJobTitles(configRes.value.jobTitles);
        }

        if (projectsRes.status === 'fulfilled') {
          setProjects(projectsRes.value || []);
        }

        if (postsRes.status === 'fulfilled') {
          setPosts(postsRes.value || []);
        }

        if (creditsRes.status === 'fulfilled') {
          setCredits(creditsRes.value || []);
        }
      } catch (err) {
        console.error('Other data fetch failed:', err);
      }
    };

    loadOtherData();
  }, []);

  const filteredProjects = projects.filter(p => p.featured).slice(0, 3);
  // Same reading_minutes calculation as /blog's own listing (BlogCard is a shared component, so
  // both listings should carry the same meta row) - only computable for "native" posts, whose
  // body is already in this same response; an "external_url" post's body lives at a separate URL.
  const filteredPosts = posts
    .filter((p) => p.featured)
    .slice(0, 4)
    .map((p) => ({ ...p, reading_minutes: p.source_type === 'native' ? estimateReadingMinutes(p.content) : undefined }));

  return (
    <div className="min-h-screen text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />

      <main>
      <HeroSection
        description={heroDescription}
        jobTitles={jobTitles}
        credits={credits}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        onRequestResume={openResumeRequest}
      />

      {/* Featured Projects - Bento Feature Grid */}
      <section id="projects" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-baseline justify-between gap-6 flex-wrap mb-2">
            <h2
              className="group/heading inline-flex items-baseline gap-1.5 text-3xl sm:text-4xl text-black"
              style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              <a href="#projects" className="hover:opacity-70 transition-opacity">FEATURED PROJECTS</a>
              {/* self-start instead of following the heading's items-baseline - a plain sup sits
                  almost on the baseline, barely elevated; this pulls it to the top of the line so
                  it actually reads as a count badge at the top-right of the word. */}
              <sup className="self-start text-sm font-mono font-medium text-[var(--ds-charcoal)]/50">
                ({projects.length})
              </sup>
              <CopySectionLinkButton sectionId="projects" label="Projects" />
            </h2>
            <Link href="/projects" data-cursor-label="Browse" className="group inline-flex items-center gap-1.5 font-bold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
              <span className="relative">
                Browse all projects
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-black origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-base font-medium text-[var(--ds-charcoal)]/60 mb-9">
            Take a look around — here&apos;s what I&apos;ve been building.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, i) => (
              <ProjectRow key={project.id} project={project} index={i} />
            ))}
            {Array.from({ length: Math.max(0, 3 - filteredProjects.length) }).map((_, i) => (
              <EmptyProjectCard key={`empty-${i}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Blog - dark charcoal section for contrast */}
      <section id="blog" className="border-y-2 border-black" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-baseline justify-between gap-6 flex-wrap mb-2">
            <h2
              className="group/heading inline-flex items-baseline gap-1.5 text-3xl sm:text-4xl text-white"
              style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              <a href="#blog" className="hover:opacity-70 transition-opacity">BLOG</a>
              <sup className="self-start text-sm font-mono font-medium text-white/50">
                ({posts.length})
              </sup>
              <CopySectionLinkButton sectionId="blog" label="Blog" />
            </h2>
            <Link href="/blog" data-cursor-label="Browse" className="group inline-flex items-center gap-1.5 font-bold shrink-0 text-[var(--ds-yellow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <span className="relative">
                Browse all blog
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-[var(--ds-yellow)] origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-base font-medium text-white/60 mb-9">
            Nothing to do? Wanna read some blogs?
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {filteredPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
            {Array.from({ length: Math.max(0, 4 - filteredPosts.length) }).map((_, i) => (
              <EmptyBlogCard key={`empty-${i}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Work together - replaces the old inline Credits band (credits now
          live in the fake browser mockup, see HeroSection). Same sage band
          between Blog and the dark Footer. Styled as "Option E" from the
          Claude Design ticket-stub exploration (design/p/40f62b31.../Work
          Together Section Options.html) - ported from its real SVG markup,
          not eyeballed from a screenshot: the outline, the two color panels,
          and the perforation notches are all one SVG clip-path
          (`ticketClipMerged` in the source), sized to the source's exact
          900x300 canvas via a locked 3:1 aspect-ratio wrapper so every
          radius/notch stays in proportion as it scales. Content sits in a
          flex row on top at the source's exact 600:300 (2:1) panel split.
          Desktop-only: the source has no mobile variant, and forcing the
          3:1 ticket shape at phone widths would make the text illegibly
          small, so narrow screens fall back to a simpler stacked card with
          a plain dashed rule instead of the notched SVG outline. */}
      <section id="work-together" className="border-y-2 border-black" style={{ backgroundColor: 'var(--ds-sage)' }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Desktop: exact ticket-stub geometry from the design file. Full
              width of the shared max-w-6xl container, same as Featured
              Projects/Blog above - no separate cap. The 900x300 canvas the
              notch/radius math was authored against is just the aspect
              ratio (locked via aspect-ratio below); the container-query
              font clamps size type off the ticket's actual rendered width,
              not that reference canvas, so it keeps scaling past 900px
              instead of stalling out at the design's original size. */}
          <div className="relative hidden md:block mx-auto w-full">
            <div className="relative" style={{ aspectRatio: '900 / 300', containerType: 'inline-size' } as React.CSSProperties}>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 900 300"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="workTogetherTicketClip" clipPathUnits="userSpaceOnUse">
                    <path d="M14,0 L588,0 A12,12 0 0,0 612,0 L886,0 A14,14 0 0,1 900,14 L900,286 A14,14 0 0,1 886,300 L612,300 A12,12 0 0,0 588,300 L14,300 A14,14 0 0,1 0,286 L0,170 A20,20 0 0,0 0,130 L0,14 A14,14 0 0,1 14,0 Z" />
                  </clipPath>
                </defs>
                <rect x="0" y="0" width="600" height="300" fill="var(--ds-charcoal)" clipPath="url(#workTogetherTicketClip)" />
                <rect x="600" y="0" width="300" height="300" fill="#fff" clipPath="url(#workTogetherTicketClip)" />
                {/* Header/footer as flat solid-color bands (no slant) - the
                    reference ticket's header runs flush from the very top
                    edge, but its footer band sits inset with a margin above
                    the ticket's actual bottom edge rather than touching it,
                    so only the header rect ever reaches the clip-path's
                    curved top corners; the footer rect sits fully inside the
                    straight side edges. Header is deliberately taller than
                    the footer; the footer is still sized to hold a full row
                    of ticket-detail fields plus the barcode, not just the
                    barcode alone. */}
                <rect x="0" y="0" width="900" height="56" fill="var(--ds-yellow)" clipPath="url(#workTogetherTicketClip)" />
                <rect x="0" y="254" width="900" height="32" fill="var(--ds-yellow)" clipPath="url(#workTogetherTicketClip)" />
                <path
                  d="M14,0 L588,0 A12,12 0 0,0 612,0 L886,0 A14,14 0 0,1 900,14 L900,286 A14,14 0 0,1 886,300 L612,300 A12,12 0 0,0 588,300 L14,300 A14,14 0 0,1 0,286 L0,170 A20,20 0 0,0 0,130 L0,14 A14,14 0 0,1 14,0 Z"
                  fill="none"
                  stroke="#000"
                  strokeWidth="1.5"
                  strokeLinejoin="miter"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Drawn last (on top of the outline and both bands, not
                    just the middle white/charcoal gap) and run close to the
                    full ticket height so it visibly crosses through the
                    header/footer bands instead of stopping short at their
                    edges. The perforation notch at x=600 is NOT symmetric in
                    the way it first looks: measured via getPointAtLength,
                    the outline's actual boundary there sits at y~11.9 (top)
                    and y~288.2 (bottom) - not the naive 0/300 - so y1/y2
                    stay a couple units inside those, or the dashes visibly
                    poke past the ticket's own outline into the page
                    background. */}
                <line x1="600" y1="14" x2="600" y2="286" stroke="var(--ds-charcoal)" strokeWidth="2.5" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
              </svg>

              {/* Header-band content (train icon + flight-style metadata)
                  and footer-band content (barcode) render as a normal HTML
                  overlay, not inside the stretched background SVG above -
                  preserveAspectRatio="none" non-uniformly scales that SVG's
                  coordinate space, which is invisible for flat color shapes
                  but would visibly warp text glyphs and the barcode's bar
                  proportions. */}
              <div className="absolute flex items-center" style={{ top: 0, left: 0, right: 0, height: '18.7%' }}>
                {/* Left column is the same 66.6667% width as the stub below
                    it - icon+wordmark anchor to its left edge, the ticket ID
                    is pushed (ml-auto) to the column's right edge, which is
                    exactly where the dashed divider runs. */}
                <div className="flex items-center justify-between" style={{ width: '66.6667%', height: '100%', padding: '0 2% 0 2.2%' }}>
                  <div className="flex items-center" style={{ gap: '0.5em' }}>
                    <WorkTogetherTrainLogo height="clamp(1.25rem, 3.2cqw, 2.25rem)" />
                    <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(1.25rem, 3.2cqw, 2.25rem)', lineHeight: 0.95, letterSpacing: '-0.01em', color: 'var(--ds-charcoal)', textTransform: 'uppercase' }}>
                      Boarding pass
                    </span>
                  </div>
                  <span suppressHydrationWarning style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(9px, 1.05cqw, 13px)', color: 'rgba(23,30,25,0.55)', letterSpacing: '0.03em' }}>
                    {ticketId}
                  </span>
                </div>
                <div className="text-right leading-tight" style={{ width: '33.3333%', padding: '0 2.4% 0 3.6%' }}>
                  <div style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(9px, 1.05cqw, 13px)', color: 'var(--ds-charcoal)', letterSpacing: '0.04em' }}>
                    TRAIN TICKET
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'clamp(6.5px, 0.7cqw, 9px)', color: 'rgba(23,30,25,0.55)' }}>
                    {WORK_TOGETHER_DESTINATIONS[destIndex].coords}
                  </div>
                </div>
              </div>

              {/* Footer band - the date/departure/destination/price fields
                  that used to sit at the bottom-left of the dark panel now
                  live here instead (charcoal-side half), alongside the
                  Privacy Policy agreement text and the barcode (white-side
                  half, scaled to the band's own height rather than a fixed
                  small size). Each field's value crossfades via
                  WorkTogetherFieldValue on every destIndex change instead of
                  snapping. */}
              <div className="absolute flex items-center" style={{ top: '84.7%', left: 0, right: 0, height: '10.7%' }}>
                {/* padding-left is 4%, not 6% like the text column above -
                    percentage padding resolves against each element's OWN
                    containing block, and this row's containing block is the
                    full-width footer div above (100% of the ticket) while
                    the text column's is the 66.6667%-wide left panel, so
                    the same "6%" number was two different pixel amounts.
                    6% * 66.6667% = 4%, which is what actually lines the two
                    up. */}
                <div className="flex items-center gap-6" style={{ width: '66.6667%', height: '100%', padding: '0 2% 0 4%' }}>
                  {[
                    { label: 'DATE', value: WORK_TOGETHER_DESTINATIONS[destIndex].date },
                    { label: 'DEPARTURE', value: WORK_TOGETHER_DESTINATIONS[destIndex].departure },
                    { label: 'DESTINATION', value: WORK_TOGETHER_DESTINATIONS[destIndex].name },
                  ].map((field) => (
                    <div key={field.label} className="flex flex-col gap-0.5">
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(6px, 0.55cqw, 7.5px)', letterSpacing: '0.09em', color: 'rgba(23,30,25,0.55)' }}>
                        {field.label}
                      </span>
                      <WorkTogetherFieldValue
                        destIndex={destIndex}
                        style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(9px, 1cqw, 13px)', color: 'var(--ds-charcoal)', display: 'block' }}
                      >
                        {field.value}
                      </WorkTogetherFieldValue>
                    </div>
                  ))}
                  <div className="flex flex-col gap-0.5">
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(6px, 0.55cqw, 7.5px)', letterSpacing: '0.09em', color: 'rgba(23,30,25,0.55)' }}>
                      PRICE
                    </span>
                    <WorkTogetherFieldValue
                      destIndex={destIndex}
                      style={{
                        fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(9px, 1cqw, 13px)',
                        color: 'var(--ds-yellow)', backgroundColor: 'var(--ds-charcoal)', padding: '1px 6px', borderRadius: '3px', width: 'fit-content', display: 'block',
                      }}
                    >
                      {WORK_TOGETHER_DESTINATIONS[destIndex].price}
                    </WorkTogetherFieldValue>
                  </div>
                </div>
                <div className="flex items-center justify-between" style={{ width: '33.3333%', height: '100%', padding: '0 2.4% 0 3.6%' }}>
                  <p className="text-black/60" style={{ fontSize: 'clamp(7px, 0.75cqw, 9px)', margin: 0, maxWidth: '55%' }}>
                    Agree to the{' '}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" data-cursor-label="Open" className="font-bold underline hover:text-black">
                      Privacy Policy
                    </Link>{' '}
                    and{' '}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" data-cursor-label="Open" className="font-bold underline hover:text-black">
                      Terms &amp; Conditions
                    </Link>
                  </p>
                  <div style={{ width: 90, height: 24 }}>
                    <WorkTogetherBarcode width={90} height={24} color="var(--ds-charcoal)" />
                  </div>
                </div>
              </div>

              {/* z-index: 1 - the destination particle photo below (DestinationParticles) is a
                  later, also position:absolute sibling with no z-index of its own, so without
                  this the two resolve stacking by DOM order alone and the particle canvas ends up
                  ON TOP for hit-testing - invisible in practice since the particles render sparse
                  enough to still show the text through them, but it silently ate every hover/click
                  meant for anything in this column (confirmed via elementFromPoint - the "Let's
                  talk" copy-link button was completely unreachable). Raising just this content
                  layer's stacking - not touching the particle div's own pointer-events - keeps its
                  self-dispatched ambient hover animation intact everywhere it doesn't overlap real
                  interactive content. */}
              <div className="absolute flex" style={{ left: 0, right: 0, top: '21%', bottom: '17%', zIndex: 1 }}>
                {/* Stub - left panel, exactly 600/900 = 66.667%, split into
                    the text column and a landmark-illustration column
                    ("at the right hand side of the dark area", per the
                    request) sharing that width. */}
                <div className="flex" style={{ width: '66.6667%' }}>
                  <div className="flex flex-col justify-center gap-2.5" style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '50%', padding: '0 2% 0 6%' }}>
                    <h2
                      className="group/heading inline-flex items-baseline gap-1"
                      style={{
                        fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(1.65rem, 4.2cqw, 3rem)',
                        lineHeight: 0.95, letterSpacing: '-0.01em', color: 'var(--ds-yellow)', margin: 0, textTransform: 'uppercase',
                      }}
                    >
                      Let&apos;s talk
                      <CopySectionLinkButton sectionId="work-together" label="Let's talk" />
                    </h2>
                    <RouteMotionLine durationMs={WORK_TOGETHER_ROTATION_MS} />
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 'clamp(8px, 0.8cqw, 10px)', fontWeight: 700,
                        letterSpacing: '0.08em', color: 'rgba(255,225,124,0.65)', textTransform: 'uppercase',
                      }}
                    >
                      Direct line &middot; no transfers
                    </span>
                    <p style={{ fontSize: 'clamp(10px, 1.15cqw, 14px)', color: 'rgba(255,255,255,0.65)', margin: 0, maxWidth: 340 }}>
                      Interested in working together? Leave your email &mdash; I&apos;ll get back to you directly.
                    </p>
                  </div>
                </div>

                {/* Counterfoil - right panel, exactly 300/900 = 33.333%.
                    Coordinates line now lives in the header (inline with the
                    TRAIN TICKET wordmark), not here. */}
                <div className="flex flex-col justify-center gap-1.5" style={{ width: '33.3333%', padding: '0 3% 0 3.6%' }}>
                  {leadSubmitted ? (
                    <div>
                      <p className="font-extrabold mb-1 text-black" style={{ fontFamily: 'var(--ds-font-display)', fontSize: 'clamp(0.9rem, 1.6cqw, 1.35rem)' }}>
                        Got it!
                      </p>
                      <p style={{ fontSize: 'clamp(10.5px, 1.2cqw, 15px)', color: 'rgba(0,0,0,0.7)' }}>
                        Thanks for reaching out &mdash; I&apos;ll take a look and email you directly.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleLeadSubmit} className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        placeholder="Name (optional)"
                        aria-label="Name (optional)"
                        className="w-full border-2 border-black bg-white text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/50 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                        style={{ fontSize: 'clamp(10.5px, 1.2cqw, 15px)', padding: '7px 9px', borderRadius: '0.5rem' }}
                      />
                      <input
                        type="email"
                        required
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        placeholder="Email *"
                        aria-label="Email (required)"
                        className="w-full border-2 border-black bg-white text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/50 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                        style={{ fontSize: 'clamp(10.5px, 1.2cqw, 15px)', padding: '7px 9px', borderRadius: '0.5rem' }}
                      />
                      <textarea
                        required
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                        placeholder="Message *"
                        aria-label="Message (required)"
                        rows={3}
                        className="w-full border-2 border-black bg-white text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/50 resize-none overflow-y-auto focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                        style={{ fontSize: 'clamp(10.5px, 1.2cqw, 15px)', padding: '7px 9px', borderRadius: '0.5rem' }}
                      />
                      {leadError && <p className="text-[10px] font-bold text-red-700">{leadError}</p>}
                      <button
                        type="submit"
                        disabled={leadSubmitting}
                        data-cursor-label="Send"
                        className={`inline-flex items-center justify-center gap-1.5 border-2 border-black shadow-[0px_3px_0px_0px_var(--ds-yellow)] hover:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-[0px_3px_0px_0px_var(--ds-yellow)] ${workTogetherPushBtn} focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                        style={{
                          marginTop: 2, height: '10.6%', minHeight: 28, fontFamily: 'var(--ds-font-display)', fontWeight: 800,
                          fontSize: 'clamp(9.5px, 1.1cqw, 13.5px)', backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)',
                          borderRadius: '0.5rem',
                        }}
                      >
                        {leadSubmitting ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : null}
                        DEPART
                        {!leadSubmitting && <span aria-hidden="true" style={{ fontSize: '1.05em' }}>?</span>}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Destination photo - full-bleed against the header, footer,
                  and dashed divider (no padding), spanning 3/4 of the dark
                  panel's width (150/900 to 600/900 - extended a further
                  quarter-panel to the left from its original half-width) so
                  it now overlaps the text column instead of living inside
                  the constrained content-zone row above, per an explicit
                  correction: it read as too small/boxed-in there. The
                  overlap is why DestinationParticles masks its own left
                  edge to a fade - see the comment there. */}
              <div className="absolute hidden lg:block" style={{ top: '18.7%', bottom: '15.3%', left: '16.667%', width: '50%' }}>
                <DestinationParticles index={destIndex} />
              </div>
            </div>
          </div>

          {/* Mobile: stacked fallback - the design has no small-screen
              variant, and the 3:1 ticket shape would make text illegible
              this narrow, so this trades the exact notch geometry for a
              plain dashed rule instead. */}
          <div className="md:hidden border-2 border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden" style={{ borderRadius: '1.25rem' }}>
            {/* Same header/footer stripe motif as the desktop ticket, as a
                plain CSS diagonal gradient instead of an SVG pattern - this
                card isn't viewBox-scaled, so there's no distortion risk to
                design around. */}
            <div
              className="flex items-center justify-between px-4"
              style={{ height: 54, backgroundColor: 'var(--ds-yellow)' }}
            >
              <div className="flex items-center" style={{ gap: 6 }}>
                <WorkTogetherTrainLogo height={14} />
                <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 14, color: 'var(--ds-charcoal)', letterSpacing: '0.04em' }}>
                  BOARDING PASS
                </span>
              </div>
            </div>
            <div className="p-6" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
              <h2
                className="group/heading inline-flex items-baseline gap-1"
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: '1.75rem', lineHeight: 0.95, letterSpacing: '-0.01em', color: 'var(--ds-yellow)', marginTop: 0, marginBottom: 12, textTransform: 'uppercase' }}
              >
                Let&apos;s talk
                <CopySectionLinkButton sectionId="work-together" label="Let's talk" />
              </h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,225,124,0.65)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                Direct line &middot; no transfers
              </span>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                Interested in working together? Leave your email &mdash; I&apos;ll get back to you directly.
              </p>
            </div>
            <div className="p-6 bg-white flex flex-col gap-2" style={{ borderTop: '2px dashed var(--ds-charcoal)' }}>
              <div className="flex items-baseline justify-between">
                <p suppressHydrationWarning style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--ds-charcoal)', margin: 0, letterSpacing: '0.03em' }}>
                  {ticketId}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 10, color: 'rgba(0,0,0,0.45)', margin: 0 }}>
                  {WORK_TOGETHER_DESTINATIONS[destIndex].coords}
                </p>
              </div>
              {leadSubmitted ? (
                <div>
                  <p className="font-extrabold text-lg mb-1 text-black" style={{ fontFamily: 'var(--ds-font-display)' }}>
                    Got it!
                  </p>
                  <p className="text-sm text-black/70">Thanks for reaching out &mdash; I&apos;ll take a look and email you directly.</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="Name (optional)"
                    aria-label="Name (optional)"
                    className="w-full px-3 py-2.5 border-2 border-black bg-white text-sm text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/50 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                    style={{ borderRadius: '0.5rem' }}
                  />
                  <input
                    type="email"
                    required
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="Email *"
                    aria-label="Email (required)"
                    className="w-full px-3 py-2.5 border-2 border-black bg-white text-sm text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/50 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                    style={{ borderRadius: '0.5rem' }}
                  />
                  <textarea
                    required
                    value={leadForm.message}
                    onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                    placeholder="Message *"
                    aria-label="Message (required)"
                    rows={3}
                    className="w-full px-3 py-2.5 border-2 border-black bg-white text-sm text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/50 resize-none overflow-y-auto focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                    style={{ borderRadius: '0.5rem' }}
                  />
                  {leadError && <p className="text-xs font-bold text-red-700">{leadError}</p>}
                  <button
                    type="submit"
                    disabled={leadSubmitting}
                    data-cursor-label="Send"
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3 font-extrabold border-2 border-black shadow-[0px_4px_0px_0px_var(--ds-yellow)] hover:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-[0px_4px_0px_0px_var(--ds-yellow)] ${workTogetherPushBtn} focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                    style={{ fontFamily: 'var(--ds-font-display)', backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)', borderRadius: '0.5rem' }}
                  >
                    {leadSubmitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                    DEPART
                    {!leadSubmitting && <span aria-hidden="true" className="text-lg leading-none">?</span>}
                  </button>
                </form>
              )}
            </div>
            {/* Footer - date/departure/destination/price fields (crossfading
                per WorkTogetherFieldValue) plus the Privacy Policy agreement
                text and a barcode scaled to the band's own height, mirroring
                the desktop ticket's footer band. */}
            <div className="px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--ds-yellow)' }}>
              <div className="flex items-end gap-4 flex-wrap">
                {[
                  { label: 'DATE', value: WORK_TOGETHER_DESTINATIONS[destIndex].date },
                  { label: 'DEPARTURE', value: WORK_TOGETHER_DESTINATIONS[destIndex].departure },
                  { label: 'DESTINATION', value: WORK_TOGETHER_DESTINATIONS[destIndex].name },
                ].map((field) => (
                  <div key={field.label} className="flex flex-col gap-0.5">
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 8, letterSpacing: '0.09em', color: 'rgba(23,30,25,0.55)' }}>
                      {field.label}
                    </span>
                    <WorkTogetherFieldValue destIndex={destIndex} style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 13, color: 'var(--ds-charcoal)', display: 'block' }}>
                      {field.value}
                    </WorkTogetherFieldValue>
                  </div>
                ))}
                <div className="flex flex-col gap-0.5">
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 8, letterSpacing: '0.09em', color: 'rgba(23,30,25,0.55)' }}>
                    PRICE
                  </span>
                  <WorkTogetherFieldValue
                    destIndex={destIndex}
                    style={{
                      fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 13,
                      color: 'var(--ds-yellow)', backgroundColor: 'var(--ds-charcoal)', padding: '1px 7px', borderRadius: '3px', width: 'fit-content', display: 'block',
                    }}
                  >
                    {WORK_TOGETHER_DESTINATIONS[destIndex].price}
                  </WorkTogetherFieldValue>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p style={{ fontSize: 10.5, color: 'rgba(23,30,25,0.6)', margin: 0 }}>
                  Agree to the{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" data-cursor-label="Open" className="font-bold underline text-black">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" data-cursor-label="Open" className="font-bold underline text-black">
                    Terms &amp; Conditions
                  </Link>
                </p>
                {/* WorkTogetherBarcode now renders at width/height 100% of
                    its own box (so the desktop footer's copies can stretch
                    to fill a fixed-height band) - this row has no explicit
                    height of its own for that percentage to resolve
                    against, so give the wrapper one directly. */}
                <div style={{ width: 72, height: 34 }}>
                  <WorkTogetherBarcode width={72} height={34} color="var(--ds-charcoal)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      </main>

      <SiteFooter />
    </div>
  );
}
