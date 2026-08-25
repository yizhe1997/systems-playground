'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, RotateCcw, Sparkles } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ProjectRow, { type Project } from '@/components/ProjectRow';
import EmptyProjectCard from '@/components/EmptyProjectCard';
import ProjectTagFilter from '@/components/ProjectTagFilter';
import ViewToggle, { type ViewMode } from '@/components/ViewToggle';
import ProjectsConstellation, { type ProjectsConstellationHandle } from '@/components/ProjectsConstellation';
import CopySectionLinkButton from '@/components/CopySectionLinkButton';
import RadialRevealButton from '@/components/originkit/radial-reveal-button';
import { useMcpConnect } from '@/components/McpConnectModal';
import { fetchJson } from '@/lib/fetch-json';

const PAGE_SIZE = 6;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { open: openMcpConnect } = useMcpConnect();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const graphRef = useRef<ProjectsConstellationHandle>(null);

  useEffect(() => {
    fetchJson<Project[]>('/api/projects')
      .then((data) => setProjects(data || []))
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tech_stack))).sort(),
    [projects]
  );

  // Graph always gets the full unfiltered list - the whole point of that view is showing every
  // relationship at once, so silently omitting nodes because a grid filter happens to be active
  // (with nothing in the graph UI explaining why) would defeat the point of building it.
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => activeTags.size === 0 || p.tech_stack.some((t) => activeTags.has(t)))
      .filter((p) => !q || (p.title || '').toLowerCase().includes(q));
  }, [projects, activeTags, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = useMemo(
    () => filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProjects, page]
  );

  // Reset to page 1 whenever the filtered set's shape changes (tag/search edited) - during
  // render, matching the pattern already used for this in admin's ResumeRequests table - rather
  // than a setPage(1) call duplicated into every filter-changing handler.
  const filterKey = `${Array.from(activeTags).sort().join(',')}|${search}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const handleTagToggle = (tag: string | null) => {
    setActiveTags((prev) => {
      if (tag === null) return new Set();
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-20 w-full">
        <h1
          className="group/heading mb-8 inline-flex items-baseline gap-1.5 text-black"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          PROJECTS
          {/* items-baseline on the parent puts a plain sup almost on the text baseline - fine for
              the homepage's much smaller h2, but barely visible against this page's hero-sized
              h1. self-start pulls it to the top of the line instead, landing it at the top-right
              corner of the word the way a superscript count is supposed to read. */}
          <sup className="self-start text-sm font-mono font-medium text-[var(--ds-charcoal)]/50">
            ({projects.length})
          </sup>
          <CopySectionLinkButton label="Projects page" />
        </h1>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70">Loading&hellip;</p>
        ) : (
          <>
            {/* One toolbar row, left to right in priority order: how you're viewing, then how
                you're narrowing it down (grid only), then the secondary escape hatch pushed to
                the far right - rather than two separately-aligned rows that don't share a
                baseline. */}
            <div className="flex items-center flex-wrap gap-3 mb-8">
              <ViewToggle value={viewMode} onChange={setViewMode} />

              {viewMode === 'grid' ? (
                <>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-charcoal)]/40" aria-hidden="true" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by title…"
                      aria-label="Search projects by title"
                      className="pl-8 pr-3 py-2 w-56 bg-white border-2 border-black text-sm font-bold placeholder:font-normal placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow"
                      style={{ borderRadius: '0.5rem' }}
                    />
                  </div>
                  <ProjectTagFilter tags={allTags} activeTags={activeTags} onToggle={handleTagToggle} />
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => graphRef.current?.resetView()}
                  data-cursor-label="Reset"
                  className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white text-sm font-bold hover:bg-black hover:text-white transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset view
                </button>
              )}

              {/* "Talk to this portfolio" - matches the same button in SiteFooter.tsx. A black
                  border only reads against a light fill, so this flips to the DS's yellow-fill/
                  charcoal-text combo (used elsewhere for the yellow VARIANTS card) instead of a
                  black fill - and reveals to the inverse (charcoal fill/yellow text) on hover,
                  rather than needing a shadow to give it edge definition. */}
              <RadialRevealButton
                label="Talk to this portfolio"
                onClick={openMcpConnect}
                data-cursor-label="Open"
                style={{ marginLeft: 'auto' }}
                font={{ fontFamily: 'var(--ds-font-body)', fontWeight: 700, fontSize: 14, lineHeight: '1.2em', letterSpacing: '0em', textAlign: 'left' }}
                padding="10px 14px"
                rounded={40}
                colors={{
                  fill: 'var(--ds-yellow)',
                  textColor: 'var(--ds-charcoal)',
                  hoverFill: 'var(--ds-charcoal)',
                  hoverTextColor: 'var(--ds-yellow)',
                }}
                border={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'var(--ds-black)' }}
                addIcon
                icon={{ type: 'node', node: <Sparkles className="w-3.5 h-3.5" />, color: 'var(--ds-charcoal)', hoverColor: 'var(--ds-yellow)', side: 'left' }}
                gap={6}
              />
            </div>

            {viewMode === 'grid' ? (
              <>
                {filteredProjects.length === 0 && projects.length > 0 ? (
                  <div
                    className="flex flex-col items-center justify-center gap-2.5 border-black bg-[#fafafa] text-center"
                    style={{
                      borderWidth: '2px',
                      borderStyle: 'dashed solid solid dashed',
                      borderRadius: '0 0.75rem 0.75rem 0.75rem',
                      padding: '40px 20px',
                    }}
                  >
                    <div className="font-extrabold text-sm" style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-charcoal)' }}>
                      No projects match
                    </div>
                    <div className="text-xs text-[var(--ds-charcoal)]/55">Try a different search or tag</div>
                    <button
                      onClick={() => {
                        handleTagToggle(null);
                        setSearch('');
                      }}
                      className="text-xs font-bold underline mt-1"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pagedProjects.map((project, i) => (
                        <ProjectRow key={project.id} project={project} index={i} />
                      ))}
                      {/* Pad the grid up to PAGE_SIZE with empty-state cards rather than leaving a
                          ragged short row - covers both "no projects published yet" (0 real cards)
                          and a partially-filled last page (e.g. 2 real + 4 empty). */}
                      {Array.from({ length: PAGE_SIZE - pagedProjects.length }).map((_, i) => (
                        <EmptyProjectCard key={`empty-${i}`} />
                      ))}
                    </div>
                    {/* Always visible, even at zero/one page - matches admin's ResumeRequests
                        table, which never hides its pagination bar just because everything fits
                        on one page. */}
                    {/* Three-column grid, not flex justify-between - a plain flex row can only
                        push "Page X of Y" to one side or the other, never keep it centered while
                        the nav buttons live on the right. The empty first cell is a deliberate
                        spacer so the grid's middle column - and therefore the page text - stays
                        centered on the row regardless of how wide the nav cluster is. */}
                    <div className="grid grid-cols-3 items-center gap-4 mt-10">
                      <div />
                      <span className="text-sm font-bold text-[var(--ds-charcoal)]/70 justify-self-center">
                        Page {page} of {totalPages}
                      </span>

                      <div className="flex items-center gap-2 justify-self-end">
                        <button
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          aria-label="Go to first page"
                          className="p-2 border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          aria-label="Go to previous page"
                          className="p-2 border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          aria-label="Go to next page"
                          className="p-2 border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                          aria-label="Go to last page"
                          className="p-2 border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <ProjectsConstellation ref={graphRef} projects={projects} />
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
