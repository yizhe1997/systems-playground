'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HeroSection from '@/components/HeroSection';
import ProjectRow, { type Project as ProjectRowType } from '@/components/ProjectRow';
import { formatPublishedDate } from '@/lib/format-date';
import { useResumeRequest } from '@/components/ResumeRequestModal';
import { fetchJson } from '@/lib/fetch-json';

type Project = ProjectRowType & { featured: boolean };

type Post = {
  id: string;
  title: string;
  cover_image_url: string;
  published_date: string;
  featured: boolean;
};

type CreditItem = { text: string; url: string };
type CreditRow = { id: string; label: string; items: CreditItem[] };

const DEFAULT_HERO_DESCRIPTION =
  'Self-hosted infrastructure, actually running — with AI as a working collaborator, not a gimmick.';

export default function Home() {
  const { open: openResumeRequest } = useResumeRequest();
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);

  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');
  const [heroDescription, setHeroDescription] = useState<string>(DEFAULT_HERO_DESCRIPTION);

  const formatUrl = (url: string) => {
    if (!url || url === '#') return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  useEffect(() => {
    const loadOtherData = async () => {
      try {
        const [configRes, projectsRes, postsRes, creditsRes] = await Promise.allSettled([
          fetchJson<{ resumeUrl?: string; linkedinUrl?: string; githubUrl?: string; heroDescription?: string }>('/api/config'),
          fetchJson<Project[]>('/api/projects'),
          fetchJson<Post[]>('/api/posts'),
          fetchJson<CreditRow[]>('/api/credits'),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value) {
          if (configRes.value.linkedinUrl) setLinkedinUrl(configRes.value.linkedinUrl);
          if (configRes.value.githubUrl) setGithubUrl(configRes.value.githubUrl);
          if (configRes.value.heroDescription) setHeroDescription(configRes.value.heroDescription);
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

  const filteredProjects = projects.filter(p => p.featured).slice(0, 4);
  const filteredPosts = posts.filter(p => p.featured).slice(0, 4);

  return (
    <div className="min-h-screen text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />

      <main>
      <HeroSection
        description={heroDescription}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        onRequestResume={openResumeRequest}
      />

      {/* Featured Projects - Bento Feature Grid */}
      <section id="projects" className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <h2
            className="text-3xl sm:text-4xl mb-10 text-black"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Featured projects
          </h2>

          {filteredProjects.length === 0 ? (
            <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] max-w-md" style={{ borderRadius: '0.75rem' }}>
              <p className="font-bold mb-1">Nothing shipped here yet</p>
              <p className="text-sm text-[var(--ds-charcoal)]/70">Real-world projects land here as they ship.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project, i) => (
                <ProjectRow key={project.id} project={project} defaultOpen={i === 0} />
              ))}
            </div>
          )}

          <Link href="/projects" className="group mt-8 inline-flex items-center gap-1.5 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
            <span className="relative">
              View all projects
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-black origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
            </span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Blog - dark charcoal section for contrast */}
      <section id="blog" className="border-y-2 border-black" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2
            className="text-3xl sm:text-4xl mb-10 text-white"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Blog
          </h2>

          {filteredPosts.length === 0 ? (
            <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] max-w-md" style={{ borderRadius: '0.75rem' }}>
              <p className="font-bold mb-1">Nothing published yet</p>
              <p className="text-sm text-[var(--ds-charcoal)]/70">Write-ups land here as they&apos;re published.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="bg-white border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_#000] group focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{ borderRadius: '0.75rem' }}
                >
                  {post.cover_image_url ? (
                    <div className="aspect-video w-full overflow-hidden border-b-2 border-black" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-video w-full border-b-2 border-black flex items-center justify-center"
                      style={{ backgroundColor: 'var(--ds-sage)' }}
                    >
                      <BookOpen className="w-10 h-10 text-black/40" aria-hidden="true" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-extrabold mb-2 group-hover:underline">{post.title}</h3>
                    {post.published_date && (
                      <p className="text-xs font-mono text-[var(--ds-charcoal)]/60">Published on {formatPublishedDate(post.published_date)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link href="/blog" className="group mt-8 inline-flex items-center gap-1.5 font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <span className="relative">
              View all posts
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-white origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
            </span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Credits - production notes, dark section continuing from Blog */}
      <section id="credits" className="border-t-2 border-black" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2
            className="text-3xl sm:text-4xl mb-10 text-white"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Credits
          </h2>

          {credits.length === 0 ? (
            <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] max-w-md" style={{ borderRadius: '0.75rem' }}>
              <p className="font-bold mb-1">Not published yet</p>
              <p className="text-sm text-[var(--ds-charcoal)]/70">Production credits land here once they&apos;re curated.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {credits.map((row) => (
                <div key={row.id} className="grid grid-cols-[110px_1fr] sm:grid-cols-[160px_1fr] gap-x-6 gap-y-1 items-start">
                  <span className="text-right text-white/40 text-sm font-medium pt-0.5">{row.label}</span>
                  <div className="flex flex-col gap-1">
                    {row.items.map((item, idx) =>
                      item.url ? (
                        <a
                          key={idx}
                          href={formatUrl(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white underline underline-offset-2 decoration-white/30 hover:decoration-[var(--ds-yellow)] hover:text-[var(--ds-yellow)] transition-colors text-sm w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {item.text}
                        </a>
                      ) : (
                        <span key={idx} className="text-white/70 text-sm">{item.text}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      </main>

      <SiteFooter />
    </div>
  );
}
