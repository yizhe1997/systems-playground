'use client';
import { ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
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

export const formatUrl = (url: string) => {
  if (!url || url === '#') return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// CommonMark requires a space after a list marker ("- item", not "-item") to recognize it as a
// list at all - a real CMS editor typing a quick "-item" per line (no space) gets silently
// rendered as plain text instead of a bullet, with no error to tell them why. Insert the missing
// space before handing off to the markdown parser, so a bare leading "-"/"*"/"+" at the start of a
// line is forgiven rather than requiring the CMS user to know exact CommonMark syntax.
// The negative lookahead excludes a second marker character right after the first, so "**bold**"
// and "---" (a horizontal rule) at the start of a line are left alone - only a lone marker
// directly butted up against ordinary text counts as an accidental bullet.
const softenBulletMarkers = (text: string) => text.replace(/^([ \t]*[-*+])(?![-*+\s])(?=\S)/gm, '$1 ');

// Compact overrides for rendering description markdown inside a small grid-card box - tight
// spacing/small type, not the full-article defaults. `a` renders as plain underlined text rather
// than a real link: the whole card (when hasLive) is already one big <a>, and a nested <a> inside
// it is invalid HTML and would fight the card's own click target.
const descriptionComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-outside pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-outside pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="pl-0.5">{children}</li>,
  a: ({ children }: { children?: React.ReactNode }) => <span className="underline decoration-dotted">{children}</span>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
};

// Card fill cycles through the three brand colors by grid position (Claude
// Design's "Featured Projects" template, matching DESIGN.md's own reference
// spec's persona-card pattern) rather than staying a flat white box - each
// caller's own .map index drives which one a given card gets, so the same
// project can land on a different color depending on which list it's
// rendered in. Charcoal needs white text and a yellow (not black) live-icon
// for visibility; sage and yellow stay on charcoal-on-light with a black icon.
export const VARIANTS = [
  { bg: 'var(--ds-sage)', text: 'var(--ds-charcoal)', tint: 'color-mix(in srgb, var(--ds-sage) 55%, white)', liveIcon: 'var(--ds-charcoal)' },
  { bg: 'var(--ds-yellow)', text: 'var(--ds-charcoal)', tint: 'color-mix(in srgb, var(--ds-yellow) 45%, white)', liveIcon: 'var(--ds-charcoal)' },
  { bg: 'var(--ds-charcoal)', text: '#ffffff', tint: 'color-mix(in srgb, var(--ds-charcoal) 25%, white)', liveIcon: 'var(--ds-yellow)' },
] as const;

// Grid card, not a collapsible row - the whole card is one pressable unit
// that links straight to the project's live_url (external, no detail page
// exists for individual projects). Cards with no live_url render as a
// plain non-interactive card - nothing to link to. Icon/title/date/link all
// share one compact header row so the description below gets the vertical
// space markdown (multi-line lists, etc.) actually needs - a soft
// mask-fade caps it at a consistent height across the grid instead of a
// hard line-clamp, which doesn't clamp cleanly across block elements like
// <ul><li>.
export default function ProjectRow({ project, index = 0 }: { project: Project; index?: number }) {
  const dateRange = formatDateRange(project.start_date, project.end_date);
  const variant = VARIANTS[index % VARIANTS.length];
  const hasLive = Boolean(project.live_url);

  const CardTag = hasLive ? 'a' : 'div';
  const cardProps = hasLive
    ? {
        href: formatUrl(project.live_url),
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `${project.title || 'Untitled project'} (opens live project)`,
        'data-cursor-label': 'Open',
      }
    : {};

  return (
    <CardTag
      {...cardProps}
      className={`relative flex flex-col gap-3.5 border-2 border-black overflow-hidden p-5 shadow-[var(--ds-shadow-md)] transition-[transform,box-shadow] duration-150 ${hasLive ? 'hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black' : ''}`}
      style={{ borderRadius: '0 0.75rem 0.75rem 0.75rem', backgroundColor: variant.bg }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 shrink-0 flex items-center justify-center border-2 border-black bg-white"
          style={{ borderRadius: '0.5rem' }}
        >
          <ProjectIcon slug={project.icon} className="w-3.5 h-3.5 text-black" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-base leading-tight truncate" style={{ fontFamily: 'var(--ds-font-display)', color: variant.text }}>
            {project.title || 'Untitled project'}
          </div>
          {dateRange && (
            <div className="text-[11px] font-mono truncate" style={{ color: variant.text, opacity: 0.55 }}>
              {dateRange}
            </div>
          )}
        </div>

        {hasLive && (
          <ExternalLink className="w-4 h-4 shrink-0 opacity-85" style={{ color: variant.liveIcon }} aria-hidden="true" />
        )}
      </div>

      {project.description && (
        // Scrollable, not faded - a mask hides overflow content with no way to actually read it,
        // which is fine for "a little too long" but breaks down for a genuinely long description.
        // overflow-y:auto keeps the card's height capped and consistent across the grid while
        // still making every word reachable.
        <div className="p-3.5" style={{ borderRadius: '0.6rem', backgroundColor: variant.tint }}>
          <div
            className="text-[13px] leading-snug text-[var(--ds-charcoal)] overflow-y-auto"
            style={{ maxHeight: '5.6em', scrollbarWidth: 'thin' }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={descriptionComponents}>
              {softenBulletMarkers(project.description)}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {project.tech_stack.map((tech) => (
            <span key={tech} className="text-[11px] font-bold px-2.5 py-1 bg-black text-white" style={{ borderRadius: '0.35rem' }}>
              {tech}
            </span>
          ))}
        </div>
      )}
    </CardTag>
  );
}
