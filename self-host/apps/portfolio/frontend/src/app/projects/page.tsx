'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ProjectRow, { type Project } from '@/components/ProjectRow';
import EmptyProjectCard from '@/components/EmptyProjectCard';
import ProjectTagFilter from '@/components/ProjectTagFilter';
import ViewToggle, { type ViewMode } from '@/components/ViewToggle';
import ProjectsConstellation from '@/components/ProjectsConstellation';
import { useMcpConnect } from '@/components/McpConnectModal';
import { fetchJson } from '@/lib/fetch-json';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { open: openMcpConnect } = useMcpConnect();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

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
  const filteredProjects = useMemo(
    () => (activeTags.size === 0 ? projects : projects.filter((p) => p.tech_stack.some((t) => activeTags.has(t)))),
    [projects, activeTags]
  );

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
          className="mb-8 text-black"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          Projects
        </h1>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70">Loading&hellip;</p>
        ) : projects.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => <EmptyProjectCard key={i} />)}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <button
                type="button"
                onClick={openMcpConnect}
                data-cursor-label="Open"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--ds-charcoal)]/70 hover:text-black transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Ask instead of scroll
              </button>
            </div>

            {viewMode === 'grid' ? (
              <>
                <ProjectTagFilter tags={allTags} activeTags={activeTags} onToggle={handleTagToggle} />

                {filteredProjects.length === 0 ? (
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
                      No projects match these tags
                    </div>
                    <div className="text-xs text-[var(--ds-charcoal)]/55">Try removing a filter</div>
                    <button onClick={() => handleTagToggle(null)} className="text-xs font-bold underline mt-1">
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project, i) => (
                      <ProjectRow key={project.id} project={project} index={i} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <ProjectsConstellation projects={projects} />
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
