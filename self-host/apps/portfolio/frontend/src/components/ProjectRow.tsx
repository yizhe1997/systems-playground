'use client';
import { ExternalLink } from 'lucide-react';
import ProjectIcon from '@/components/ProjectIcon';
import { formatDateRange } from '@/lib/date-range';

export type Project = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  live_url: string;
  start_date: string;
  end_date: string;
  icon: string;
};

const formatUrl = (url: string) => {
  if (!url || url === '#') return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// Strips common markdown syntax for the always-visible, 2-line-clamped card
// teaser - this is a compact grid card, not a rendered-markdown detail view
// (there is no detail view; the whole card links straight to live_url).
const stripMarkdown = (text: string) =>
  text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Card fill cycles through the three brand colors by grid position (Claude
// Design's "Featured Projects" template, matching DESIGN.md's own reference
// spec's persona-card pattern) rather than staying a flat white box - each
// caller's own .map index drives which one a given card gets, so the same
// project can land on a different color depending on which list it's
// rendered in. Charcoal needs white text and a yellow (not black) live-icon
// for visibility; sage and yellow stay on charcoal-on-light with a black icon.
const VARIANTS = [
  { bg: 'var(--ds-sage)', text: 'var(--ds-charcoal)', tint: 'color-mix(in srgb, var(--ds-sage) 55%, white)', liveIcon: 'var(--ds-charcoal)' },
  { bg: 'var(--ds-yellow)', text: 'var(--ds-charcoal)', tint: 'color-mix(in srgb, var(--ds-yellow) 45%, white)', liveIcon: 'var(--ds-charcoal)' },
  { bg: 'var(--ds-charcoal)', text: '#ffffff', tint: 'color-mix(in srgb, var(--ds-charcoal) 25%, white)', liveIcon: 'var(--ds-yellow)' },
] as const;

// Grid card, not a collapsible row - the whole card is one pressable unit
// that links straight to the project's live_url (external, no detail page
// exists for individual projects). Cards with no live_url render as a
// plain non-interactive card - nothing to link to. Description is always
// visible, clamped to 2 lines so every card in the grid stays the same
// height regardless of content length.
export default function ProjectRow({ project, index = 0 }: { project: Project; index?: number }) {
  const dateRange = formatDateRange(project.start_date, project.end_date);
  const variant = VARIANTS[index % VARIANTS.length];
  const hasLive = Boolean(project.live_url);

  const CardTag = hasLive ? 'a' : 'div';
  const cardProps = hasLive
    ? { href: formatUrl(project.live_url), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${project.title || 'Untitled project'} (opens live project)` }
    : {};

  return (
    <CardTag
      {...cardProps}
      className={`relative flex flex-col gap-3.5 border-2 border-black overflow-hidden p-5 shadow-[var(--ds-shadow-md)] transition-[transform,box-shadow] duration-150 ${hasLive ? 'hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black' : ''}`}
      style={{ borderRadius: '0 0.75rem 0.75rem 0.75rem', backgroundColor: variant.bg }}
    >
      <div
        className="w-9 h-9 shrink-0 flex items-center justify-center border-2 border-black bg-white"
        style={{ borderRadius: '0.5rem' }}
      >
        <ProjectIcon slug={project.icon} className="w-4 h-4 text-black" />
      </div>

      <div className="min-w-0">
        <div className="font-extrabold text-lg truncate" style={{ fontFamily: 'var(--ds-font-display)', color: variant.text }}>
          {project.title || 'Untitled project'}
        </div>
        {dateRange && (
          <div className="text-xs font-mono" style={{ color: variant.text, opacity: 0.55 }}>
            {dateRange}
          </div>
        )}
      </div>

      {(project.description || project.tech_stack.length > 0) && (
        <div className="p-3.5 space-y-2.5" style={{ borderRadius: '0.6rem', backgroundColor: variant.tint }}>
          {project.description && (
            <p
              className="text-[13px] leading-snug text-[var(--ds-charcoal)] m-0"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {stripMarkdown(project.description)}
            </p>
          )}
          {project.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tech_stack.map((tech) => (
                <span key={tech} className="text-[11px] font-bold px-2.5 py-1 bg-black text-white" style={{ borderRadius: '0.35rem' }}>
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {hasLive && (
        <ExternalLink
          className="absolute top-5 right-5 w-4 h-4 opacity-85"
          style={{ color: variant.liveIcon }}
          aria-hidden="true"
        />
      )}
    </CardTag>
  );
}
