'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Code2 } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ProjectIcon from '@/components/ProjectIcon';
import { fetchJson } from '@/lib/fetch-json';

type Project = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  live_url: string;
  github_url: string;
  icon: string;
};

const formatUrl = (url: string) => {
  if (!url || url === '#') return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<Project[]>('/api/projects')
      .then((data) => setProjects(data || []))
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-20 w-full">
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
          Projects
        </h1>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70">Loading&hellip;</p>
        ) : projects.length === 0 ? (
          <div
            className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] max-w-md"
            style={{ borderRadius: '0.75rem' }}
          >
            <p className="font-bold mb-1">Nothing shipped here yet</p>
            <p className="text-sm text-[var(--ds-charcoal)]/70">Real-world projects land here as they ship.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000]"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <div
                    className="w-14 h-14 flex items-center justify-center mb-5 border-2 border-black"
                    style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}
                  >
                    <ProjectIcon slug={project.icon} />
                  </div>
                  <h2 className="text-2xl font-extrabold mb-3" style={{ fontFamily: 'var(--ds-font-display)' }}>
                    {project.title}
                  </h2>
                  <p className="text-sm text-[var(--ds-charcoal)]/80 leading-relaxed mb-5">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.tech_stack.map((tech) => (
                      <span key={tech} className="text-xs font-bold px-2.5 py-1 border-2 border-black" style={{ borderRadius: '0.375rem' }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <a
                      href={formatUrl(project.live_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      Live
                    </a>
                    <a
                      href={formatUrl(project.github_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                      <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Source
                    </a>
                  </div>
                </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
