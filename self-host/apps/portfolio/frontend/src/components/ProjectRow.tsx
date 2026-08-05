'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ExternalLink } from 'lucide-react';
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

// Collapsible row (chanhdai.com/#projects reference) rather than a card grid.
// Title, date range, and the Live link stay visible whether the row is open
// or not - only the description and tech tags are gated behind the toggle.
// Rows are independent (not a single-open accordion): expanding one doesn't
// collapse another.
export default function ProjectRow({ project, defaultOpen = false }: { project: Project; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const dateRange = formatDateRange(project.start_date, project.end_date);

  return (
    <div className="border-2 border-black bg-white overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="w-full flex items-center gap-3 p-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <div
            className="w-9 h-9 shrink-0 flex items-center justify-center border-2 border-black"
            style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}
          >
            <ProjectIcon slug={project.icon} className="w-4 h-4 text-black" />
          </div>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0">
            <span className="font-extrabold truncate" style={{ fontFamily: 'var(--ds-font-display)' }}>
              {project.title || 'Untitled project'}
            </span>
            {dateRange && <span className="text-xs font-mono text-[var(--ds-charcoal)]/50 whitespace-nowrap">{dateRange}</span>}
          </span>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          {project.live_url && (
            <a
              href={formatUrl(project.live_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Live
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {open && (project.description || project.tech_stack.length > 0) && (
        <div className="px-5 pb-5 pl-[4.25rem] space-y-4">
          {project.description && (
            <div className="prose prose-sm max-w-none text-[var(--ds-charcoal)]/80 prose-headings:font-extrabold prose-a:text-black prose-a:underline prose-li:my-0.5 prose-p:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
            </div>
          )}
          {project.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.tech_stack.map((tech) => (
                <span key={tech} className="text-xs font-bold px-2.5 py-1 border-2 border-black" style={{ borderRadius: '0.375rem' }}>
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
