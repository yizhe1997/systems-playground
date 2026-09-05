import { motion } from 'framer-motion';
import { Star, Soup, UtensilsCrossed, Utensils, Salad, ChefHat, Wine, Grape, Coffee, Volume2, Hand } from 'lucide-react';
import SimpleIcon from '@/components/SimpleIcon';
import { formatDateRange, formatDuration } from '@/lib/date-range';
import { useResumeRequest } from '@/components/ResumeRequestModal';
import { SLIDE_DOWN_INITIAL, SLIDE_DOWN_ANIMATE, SLIDE_DOWN_TRANSITION } from '@/lib/motion';

export type StackSkill = { name: string; icon: string };
export type StackCategory = { id: string; name: string; skills: StackSkill[] };

export type Position = {
  id: string;
  title: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  bullets: string[];
  tech_tags: string[];
};
export type CompanyExperience = {
  id: string;
  company: string;
  location: string;
  location_type: string;
  positions: Position[];
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  highlights: string[];
};

const tagClass =
  'border-[1.5px] border-[rgba(255,225,124,0.6)] rounded-full px-2.5 py-0.5 font-bold text-[11px] tracking-wide';
const chipClass =
  'inline-flex items-center gap-1.5 border-[2.5px] border-black rounded-full px-3.5 py-1.5 font-extrabold text-[13px]';

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '0.02em' }}>{title}</span>
    </div>
  );
}

function Kicker({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="mt-0.5 text-[13px] font-bold tracking-wide"
      style={{ opacity: dark ? 0.65 : 0.6, color: dark ? 'var(--ds-yellow)' : 'var(--ds-charcoal)' }}
    >
      {children}
    </div>
  );
}

function Stamp({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute -top-4 border-[3px] border-black rounded-full px-4 py-2 font-extrabold text-[11px] tracking-widest uppercase ${className}`}
      style={{ fontFamily: 'var(--ds-font-display)', backgroundColor: 'var(--ds-yellow)' }}
    >
      {children}
    </div>
  );
}

// The checkerboard backing band - a sibling of whatever it sits behind (never its child with a
// negative z-index: a negative-z-index descendant still paints on top of its own parent's
// background, so it has to be a sibling, with the foreground element given position:relative +
// z-index:1 to guarantee it wins the overlap). `inset` defaults to spanning the full width of the
// menu card itself (matching the padded content's own horizontal padding, mirrored as a negative
// inset). `colorA`/`colorB` are configurable per instance - the ribbon's band stays sage/white,
// Check Please's uses the site's charcoal/yellow instead.
function CheckerBand({
  className = '',
  style,
  inset = '-left-6 sm:-left-16 -right-6 sm:-right-16',
  colorA = 'var(--ds-sage)',
  colorB = '#ffffff',
}: {
  className?: string;
  style?: React.CSSProperties;
  inset?: string;
  colorA?: string;
  colorB?: string;
}) {
  return (
    <div
      className={`absolute ${inset} ${className}`}
      style={{ background: `repeating-conic-gradient(${colorA} 0% 25%, ${colorB} 0% 50%) 0 0 / 34px 34px`, ...style }}
    />
  );
}

const RECEIPT_POINTS =
  '0,0 100,0 100,88 92,100 84,88 76,100 68,88 60,100 52,88 44,100 36,88 28,100 20,88 12,100 4,88 0,100';

function playNamePronunciation() {
  // No audio asset exists yet - drop a real clip at public/audio/name-pronunciation.mp3 and this
  // starts working with no other changes. Fails silently until then.
  new Audio('/audio/name-pronunciation.mp3').play().catch(() => {});
}

// Shared between the live /about page and the admin Settings preview dialog for the Bio field - a
// hand-copied mockup drifts from the real thing the moment either side changes, so this is the
// actual page body (the "menu card" itself - awning, ribbon, courses, the check), parameterized on
// the fields Settings can edit. It does NOT include SiteHeader/SiteFooter/the page's own sage
// backdrop - both callers wrap it in their own chrome (a full page vs. a dialog). Uses
// useResumeRequest (a hook), so it only ever renders inside a client-rendered tree - both current
// callers already are, and ResumeRequestProvider wraps the whole app in the root layout.
export default function AboutPageBody({
  bio,
  stack,
  experience,
  education,
}: {
  bio: string;
  stack: StackCategory[];
  experience: CompanyExperience[];
  education: Education[];
}) {
  const { open: openResumeRequest } = useResumeRequest();

  return (
    // Slides down from above into place on load - no bounce (a menu doesn't drop and settle
    // like a physical device would, it just arrives).
    <motion.div
      className="relative border-[6px] border-black rounded-[28px] overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #ffffff 50%, var(--ds-yellow) 50%)', color: 'var(--ds-charcoal)' }}
      initial={SLIDE_DOWN_INITIAL}
      animate={SLIDE_DOWN_ANIMATE}
      transition={SLIDE_DOWN_TRANSITION}
    >
      {/* Awning - a scalloped canopy band in the site's own three colors, flat-topped and
          round-bottomed tabs tiled edge-to-edge, standing in for a literal Italian flag. */}
      <div className="flex w-full h-16 sm:h-[92px]">
        {['var(--ds-yellow)', 'var(--ds-charcoal)', 'var(--ds-sage)', 'var(--ds-yellow)', 'var(--ds-charcoal)', 'var(--ds-sage)', 'var(--ds-yellow)', 'var(--ds-charcoal)', 'var(--ds-sage)'].map(
          (bg, i) => (
            <div key={i} className="flex-1 rounded-b-full border-2 border-black -ml-0.5 first:ml-0" style={{ backgroundColor: bg }} />
          )
        )}
      </div>

      <div className="px-6 sm:px-16 py-10 sm:py-11">
        {/* Row 1: the YZ DINER header+ribbon group (left) and STARTERS (right). The ribbon's
            checker band is a sibling of the WHOLE row (not nested in the left column) so its
            default full-width inset still reaches the card's outer edges on both sides, even
            though the ribbon pill itself only lives in the left half. */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10 items-start">
          <CheckerBand className="h-[150px] sm:h-[190px]" style={{ top: 90 }} />

          <div className="relative z-[1] flex flex-col items-center text-center gap-2.5">
            <div className="flex items-center gap-3 sm:gap-4">
              <Star size={26} color="var(--ds-charcoal)" fill="var(--ds-yellow)" strokeWidth={1.4} aria-hidden="true" />
              <h1
                className="leading-none"
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', letterSpacing: '-0.01em' }}
              >
                YZ DINER
              </h1>
              <Star size={26} color="var(--ds-charcoal)" fill="var(--ds-yellow)" strokeWidth={1.4} aria-hidden="true" />
            </div>
            <div className="text-sm sm:text-base font-bold" style={{ opacity: 0.7 }}>SERVED FRESH DAILY</div>

            <div className="flex items-center gap-5 mt-3" style={{ opacity: 0.75 }}>
              <Wine size={20} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />
              <Grape size={20} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />
              <Coffee size={20} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="relative flex justify-center mt-4 sm:mt-5">
              <div
                className="relative z-[1] flex items-center gap-2.5 rounded-full pl-7 pr-4 py-2.5"
                style={{ backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)', fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em' }}
              >
                <span>TODAY&apos;S SPECIAL: CHIN YI ZHE</span>
                <button
                  type="button"
                  onClick={playNamePronunciation}
                  aria-label="Hear how the name is pronounced"
                  data-cursor-label="Play"
                  className="flex items-center justify-center rounded-full flex-shrink-0 hover:opacity-80 transition-opacity"
                  style={{ width: 26, height: 26, border: '1.5px solid var(--ds-yellow)' }}
                >
                  <Volume2 size={14} color="var(--ds-yellow)" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* STARTERS - the actual About-page bio (same /api/config field the admin's About tab
              edits, same content SiteFooter already draws its links from), not invented facts. */}
          <div className="relative z-[1] border-[4px] border-black rounded-[18px] px-7 py-6" style={{ backgroundColor: 'var(--ds-yellow)' }}>
            <Stamp className="right-6">No. 1</Stamp>
            <SectionHeading icon={<Soup size={22} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />} title="STARTERS" />
            <Kicker>A quick word before the main event</Kicker>
            <div className="h-[3px] w-10 rounded-sm my-3.5" style={{ backgroundColor: 'var(--ds-charcoal)' }} />
            <p className="font-medium text-[15px] leading-relaxed">{bio}</p>
          </div>
        </div>

        {/* THE MAIN COURSE (experience) */}
        {experience.length > 0 && (
          <div className="relative mt-8 border-[4px] border-black rounded-[18px] px-6 sm:px-8 py-7 sm:py-8" style={{ backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)' }}>
            <div
              className="absolute -top-4 left-7 border-[3px] border-black rounded-full px-4.5 py-1.5 font-extrabold text-xs tracking-wide"
              style={{ fontFamily: 'var(--ds-font-display)', backgroundColor: 'var(--ds-yellow)', color: 'var(--ds-charcoal)' }}
            >
              FAN FAVORITES
            </div>
            <div className="mt-2">
              <SectionHeading icon={<UtensilsCrossed size={24} color="var(--ds-yellow)" strokeWidth={2} aria-hidden="true" />} title="THE MAIN COURSE" />
            </div>
            <Kicker dark>Where I&apos;ve worked, and what I did there</Kicker>

            <div className="flex flex-col mt-5">
              {experience.map((entry, i) => (
                <div
                  key={entry.id}
                  className="py-4"
                  style={i < experience.length - 1 ? { borderBottom: '2px dashed rgba(255,225,124,0.35)' } : undefined}
                >
                  <div className="flex items-baseline justify-between gap-5 flex-wrap">
                    <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 20 }}>{entry.company}</span>
                    <span className="text-[13px] font-bold" style={{ opacity: 0.6 }}>
                      {[entry.location, entry.location_type].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="mt-3 pl-4.5" style={{ borderLeft: '2px solid rgba(255,225,124,0.35)' }}>
                    {entry.positions.map((pos) => (
                      <div key={pos.id} className="mb-4 last:mb-0">
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                          <Utensils size={15} color="var(--ds-yellow)" strokeWidth={2} style={{ opacity: 0.7, flexShrink: 0 }} aria-hidden="true" />
                          <div className="flex-1 flex items-baseline justify-between gap-5 flex-wrap">
                            <span className="font-extrabold text-base">{pos.title}</span>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ opacity: 0.6 }}>
                              {[pos.employment_type, formatDateRange(pos.start_date, pos.end_date), formatDuration(pos.start_date, pos.end_date)].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        </div>
                        {pos.bullets.length > 0 && (
                          <ul className="mt-2 pl-[33px] text-sm leading-relaxed list-disc" style={{ opacity: 0.8 }}>
                            {pos.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                          </ul>
                        )}
                        {pos.tech_tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2.5 pl-[33px]">
                            {pos.tech_tags.map((tag) => <span key={tag} className={tagClass}>{tag}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 2: SIDES takes the full-height left column (position 1); CULINARY SCHOOL
            (position 2) and CHECK (position 3) stack in the right column - a tall left card
            beside two stacked right cards, per reference layout. Falls back to the old full-width
            stack when there's no stack data to fill a left column with. */}
        {stack.length > 0 ? (
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 items-stretch">
            {/* Check Please's checker band, moved out to be a sibling of this whole row (not
                nested in the right column) so its default full-width inset reaches the card's
                actual outer edges, same as the ribbon's band. SIDES needs z-[1] below so it still
                stacks above this - a plain non-positioned box always paints BELOW a position:
                absolute sibling with z-index:auto, regardless of which one comes first in the DOM
                (see CheckerBand's own comment). */}
            <CheckerBand className="h-[130px] sm:h-[170px]" style={{ top: 240 }} colorA="var(--ds-charcoal)" colorB="var(--ds-yellow)" />

            {/* SIDES - position 1 */}
            <div className="relative z-[1] border-[4px] border-black rounded-[18px] px-7 py-6" style={{ backgroundColor: '#ffffff' }}>
              <Stamp className="right-6">Extra</Stamp>
              <SectionHeading icon={<Salad size={22} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />} title="SIDES" />
              <Kicker>The stack, grouped by kind</Kicker>
              <div className="flex flex-col gap-5 mt-5">
                {stack.map((category) => (
                  <div key={category.id}>
                    <div
                      className="font-extrabold text-[13px] tracking-wide uppercase"
                      style={{ fontFamily: 'var(--ds-font-display)', opacity: 0.55 }}
                    >
                      {category.name}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {category.skills.map((skill) => (
                        <span key={skill.name} className={chipClass} style={{ backgroundColor: 'var(--ds-sage)' }}>
                          <SimpleIcon slug={skill.icon} className="w-3.5 h-3.5" />
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: CULINARY SCHOOL (position 2) above CHECK (position 3) */}
            <div className="flex flex-col gap-8">
              {education.length > 0 && (
                <div className="relative z-[1] border-[4px] border-black rounded-[18px] px-7 py-6" style={{ backgroundColor: 'var(--ds-sage)' }}>
                  <SectionHeading icon={<ChefHat size={22} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />} title="CULINARY SCHOOL" />
                  <Kicker>Education</Kicker>
                  <div className="flex flex-col gap-5 mt-4">
                    {education.map((entry) => (
                      <div key={entry.id}>
                        <div className="flex items-baseline justify-between gap-5 flex-wrap">
                          <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 19 }}>{entry.school}</span>
                          <span className="text-[13px] font-bold whitespace-nowrap" style={{ opacity: 0.65 }}>
                            {formatDateRange(entry.start_date, entry.end_date)}
                          </span>
                        </div>
                        <div className="text-sm font-bold mt-0.5" style={{ opacity: 0.75 }}>
                          {[entry.degree, entry.field_of_study].filter(Boolean).join(', ')}
                        </div>
                        {entry.highlights.length > 0 && (
                          <ul className="mt-2.5 pl-[18px] text-sm leading-relaxed list-disc" style={{ opacity: 0.8 }}>
                            {entry.highlights.map((h, hi) => <li key={hi}>{h}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* "Chef's Picks" and "Dessert" from the original mock are deliberately left out:
                  neither has any admin-managed content backing it yet, unlike every section
                  above. The checker band that used to live here moved up to be a sibling of the
                  whole row (see above) so it can span the full card width instead of just this
                  column. */}
              <div className="relative flex items-center justify-center flex-1">
                <div className="relative z-[1] w-full">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                    <polygon points={RECEIPT_POINTS} fill="var(--ds-yellow)" stroke="var(--ds-charcoal)" strokeWidth={4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="relative px-8 sm:px-11 py-6 text-center">
                    <div style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '0.04em' }}>CHECK, PLEASE!</div>
                    <div className="text-xs font-bold mt-1" style={{ opacity: 0.65 }}>Wrap it up — get in touch or grab the résumé</div>
                    <div className="flex gap-4 mt-3.5 justify-center">
                      <button
                        type="button"
                        onClick={openResumeRequest}
                        className="rounded-lg px-5 py-3 font-extrabold text-[13px]"
                        style={{ backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)' }}
                      >
                        GET MY RÉSUMÉ
                      </button>
                      <a
                        href="/#work-together"
                        className="inline-flex items-center gap-1.5 rounded-lg px-5 py-3 font-extrabold text-[13px] border-[2.5px] border-black"
                      >
                        <Hand size={14} strokeWidth={2.25} aria-hidden="true" />
                        SAY HI
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {education.length > 0 && (
              <div className="relative z-[1] mt-8 border-[4px] border-black rounded-[18px] px-7 py-6" style={{ backgroundColor: 'var(--ds-sage)' }}>
                <SectionHeading icon={<ChefHat size={22} color="var(--ds-charcoal)" strokeWidth={2} aria-hidden="true" />} title="CULINARY SCHOOL" />
                <Kicker>Education</Kicker>
                <div className="flex flex-col gap-5 mt-4">
                  {education.map((entry) => (
                    <div key={entry.id}>
                      <div className="flex items-baseline justify-between gap-5 flex-wrap">
                        <span style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 19 }}>{entry.school}</span>
                        <span className="text-[13px] font-bold whitespace-nowrap" style={{ opacity: 0.65 }}>
                          {formatDateRange(entry.start_date, entry.end_date)}
                        </span>
                      </div>
                      <div className="text-sm font-bold mt-0.5" style={{ opacity: 0.75 }}>
                        {[entry.degree, entry.field_of_study].filter(Boolean).join(', ')}
                      </div>
                      {entry.highlights.length > 0 && (
                        <ul className="mt-2.5 pl-[18px] text-sm leading-relaxed list-disc" style={{ opacity: 0.8 }}>
                          {entry.highlights.map((h, hi) => <li key={hi}>{h}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="relative flex items-center justify-center mt-16 sm:mt-[70px] mb-2.5">
              <CheckerBand className="h-[130px] sm:h-[170px]" style={{ top: -90 }} colorA="var(--ds-charcoal)" colorB="var(--ds-yellow)" />
              <div className="relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                  <polygon points={RECEIPT_POINTS} fill="var(--ds-yellow)" stroke="var(--ds-charcoal)" strokeWidth={4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="relative px-8 sm:px-11 py-6 text-center">
                  <div style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '0.04em' }}>CHECK, PLEASE!</div>
                  <div className="text-xs font-bold mt-1" style={{ opacity: 0.65 }}>Wrap it up — get in touch or grab the résumé</div>
                  <div className="flex gap-4 mt-3.5 justify-center">
                    <button
                      type="button"
                      onClick={openResumeRequest}
                      className="rounded-lg px-5 py-3 font-extrabold text-[13px]"
                      style={{ backgroundColor: 'var(--ds-charcoal)', color: 'var(--ds-yellow)' }}
                    >
                      GET MY RÉSUMÉ
                    </button>
                    <a
                      href="/#work-together"
                      className="inline-flex items-center gap-1.5 rounded-lg px-5 py-3 font-extrabold text-[13px] border-[2.5px] border-black"
                    >
                      <Hand size={14} strokeWidth={2.25} aria-hidden="true" />
                      SAY HI
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
