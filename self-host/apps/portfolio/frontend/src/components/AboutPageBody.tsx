import SimpleIcon from '@/components/SimpleIcon';
import { formatDateRange, formatDuration } from '@/lib/date-range';

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

const cardShadow = 'border-2 border-black shadow-[4px_4px_0px_0px_#000]';

// Shared between the live /about page and the admin Settings preview dialog
// for the Bio field - a hand-copied mockup drifts from the real thing the
// moment either side changes, so this is the actual page body, parameterized
// on the fields Settings can edit. No 'use client' directive: it's pure
// props-in/JSX-out, so it works unmodified whether a server component (the
// public page) or a client component (the admin dialog) renders it.
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
  return (
    <>
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

      <p className="text-lg font-medium max-w-2xl mb-16">{bio}</p>

      {/* Experience */}
      <section className="mb-16">
        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Experience
        </h2>

        {experience.length === 0 ? (
          <div className={`${cardShadow} bg-white p-8 max-w-xl`} style={{ borderRadius: '0.75rem' }}>
            <p className="font-bold mb-1">Not published yet</p>
            <p className="text-sm text-[var(--ds-charcoal)]/70">
              Real role history lands here once it&apos;s written up &mdash; nothing fabricated to fill the gap in
              the meantime.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {experience.map((co) => (
              <div key={co.id} className={`${cardShadow} bg-white p-6 sm:p-8`} style={{ borderRadius: '0.75rem' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-5">
                  <h3 className="text-xl font-extrabold" style={{ fontFamily: 'var(--ds-font-display)' }}>
                    {co.company}
                  </h3>
                  {co.location && (
                    <span className="text-sm text-[var(--ds-charcoal)]/70">
                      {co.location}
                      {co.location_type && ` (${co.location_type})`}
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  {co.positions.map((pos, pi) => (
                    <div key={pos.id} className={pi > 0 ? 'pt-6 border-t-2 border-black/10' : ''}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                        <h4 className="font-bold">
                          {pos.title}
                          {pos.employment_type && (
                            <span className="font-medium text-[var(--ds-charcoal)]/60"> &middot; {pos.employment_type}</span>
                          )}
                        </h4>
                        <span className="text-xs font-mono text-[var(--ds-charcoal)]/60 whitespace-nowrap">
                          {formatDateRange(pos.start_date, pos.end_date)}
                          {formatDuration(pos.start_date, pos.end_date) && (
                            <> &middot; {formatDuration(pos.start_date, pos.end_date)}</>
                          )}
                        </span>
                      </div>

                      {pos.bullets.filter(Boolean).length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-sm text-[var(--ds-charcoal)]/80 list-disc list-inside">
                          {pos.bullets.filter(Boolean).map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}

                      {pos.tech_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {pos.tech_tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-bold px-2.5 py-1 border-2 border-black"
                              style={{ borderRadius: '0.375rem' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stack */}
      <section className="mb-16">
        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Stack
        </h2>

        {stack.length === 0 ? (
          <div className={`${cardShadow} bg-white p-8 max-w-xl`} style={{ borderRadius: '0.75rem' }}>
            <p className="font-bold mb-1">Not published yet</p>
            <p className="text-sm text-[var(--ds-charcoal)]/70">The tools and languages list lands here once it&apos;s curated.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {stack.map((cat) => (
              <div key={cat.id} className={`${cardShadow} bg-white p-6`} style={{ borderRadius: '0.75rem' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-[var(--ds-charcoal)]/70">
                  {cat.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {cat.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 border-2 border-black"
                      style={{ borderRadius: '0.375rem' }}
                    >
                      <SimpleIcon slug={skill.icon} className="w-3.5 h-3.5" />
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Education */}
      <section>
        <h2
          className="text-2xl mb-6 text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Education
        </h2>

        {education.length === 0 ? (
          <div className={`${cardShadow} bg-white p-8 max-w-xl`} style={{ borderRadius: '0.75rem' }}>
            <p className="font-bold mb-1">Not published yet</p>
            <p className="text-sm text-[var(--ds-charcoal)]/70">Education history lands here once it&apos;s written up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {education.map((ed) => (
              <div key={ed.id} className={`${cardShadow} bg-white p-6`} style={{ borderRadius: '0.75rem' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-extrabold" style={{ fontFamily: 'var(--ds-font-display)' }}>
                    {ed.school}
                  </h3>
                  <span className="text-xs font-mono text-[var(--ds-charcoal)]/60 whitespace-nowrap">
                    {formatDateRange(ed.start_date, ed.end_date)}
                  </span>
                </div>
                {(ed.degree || ed.field_of_study) && (
                  <p className="text-sm text-[var(--ds-charcoal)]/80 mt-1">
                    {[ed.degree, ed.field_of_study].filter(Boolean).join(' — ')}
                  </p>
                )}
                {ed.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ed.highlights.map((h) => (
                      <span
                        key={h}
                        className="text-xs font-bold px-2.5 py-1 border-2 border-black"
                        style={{ borderRadius: '0.375rem' }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
