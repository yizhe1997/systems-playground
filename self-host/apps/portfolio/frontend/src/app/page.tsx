'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileDown, ExternalLink, Code2, ArrowRight, BookOpen } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ReactiveGrid from '@/components/originkit/reactivegrid';
import ProjectIcon from '@/components/ProjectIcon';
import { formatPublishedDate } from '@/lib/format-date';
import { useResumeRequest } from '@/components/ResumeRequestModal';
import { fetchJson } from '@/lib/fetch-json';
import { GithubIcon, LinkedinIcon } from '@/components/icons/social';

type Project = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  live_url: string;
  github_url: string;
  icon: string;
  featured: boolean;
};

type Post = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  published_date: string;
  featured: boolean;
};

type CreditItem = { text: string; url: string };
type CreditRow = { id: string; label: string; items: CreditItem[] };

const pushBtn =
  "transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1";

export default function Home() {
  const { open: openResumeRequest } = useResumeRequest();
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);

  const [resumeUrl, setResumeUrl] = useState<string>('#');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');

  const isConfigured = (url: string) => !!url && url !== '#';

  const formatUrl = (url: string) => {
    if (!url || url === '#') return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  useEffect(() => {
    const loadOtherData = async () => {
      try {
        const [configRes, projectsRes, postsRes, creditsRes] = await Promise.allSettled([
          fetchJson<{ resumeUrl?: string; linkedinUrl?: string; githubUrl?: string }>('/api/config'),
          fetchJson<Project[]>('/api/projects'),
          fetchJson<Post[]>('/api/posts'),
          fetchJson<CreditRow[]>('/api/credits'),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value) {
          if (configRes.value.resumeUrl) setResumeUrl(configRes.value.resumeUrl);
          if (configRes.value.linkedinUrl) setLinkedinUrl(configRes.value.linkedinUrl);
          if (configRes.value.githubUrl) setGithubUrl(configRes.value.githubUrl);
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
      {/* Hero - yellow ground + reactive grid */}
      <section className="relative border-b-2 border-black overflow-hidden" style={{ backgroundColor: 'var(--ds-yellow)' }}>
        <ReactiveGrid
          shape="circle"
          fill="solid"
          particleColor="rgba(0,0,0,0.25)"
          backgroundColor="#ffe17c"
          minSize={4}
          maxSize={10}
          gap={25}
          influence={75}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span
              className="inline-flex items-center px-4 py-1.5 bg-white border-2 border-black text-xs font-bold mb-6"
              style={{ borderRadius: '0.75rem' }}
            >
              BACKEND / PLATFORM ENGINEER
            </span>

            <h1
              className="text-black mb-6"
              style={{
                fontFamily: 'var(--ds-font-display)',
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              Chin Yi Zhe
              <br />
              builds{' '}
              <span
                className="text-white drop-shadow-[4px_4px_0px_#000]"
                style={{
                  WebkitTextStroke: '4px black',
                }}
              >
                REAL
              </span>{' '}
              systems.
            </h1>

            <p className="text-lg font-medium max-w-md mb-8">
              Self-hosted infrastructure, actually running &mdash; with AI as a working collaborator, not a gimmick.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={openResumeRequest}
                className={`inline-flex items-center gap-2 px-6 py-3.5 bg-black text-white font-bold border-2 border-black shadow-[8px_8px_0px_0px_#000] hover:shadow-none ${pushBtn} focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                style={{ borderRadius: '0.75rem' }}
              >
                <FileDown className="w-4 h-4" aria-hidden="true" />
                Request resume
              </button>
              {isConfigured(githubUrl) && (
                <a
                  href={formatUrl(githubUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-black font-bold border-2 border-black shadow-[4px_8px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <GithubIcon />
                  GitHub
                </a>
              )}
              {isConfigured(linkedinUrl) && (
                <a
                  href={formatUrl(linkedinUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-black font-bold border-2 border-black shadow-[4px_8px_0px_0px_#000] hover:shadow-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <LinkedinIcon />
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Browser mockup - real stack info, not fabricated charts/revenue */}
          <div className="hidden lg:block bg-white border-2 border-black shadow-[12px_12px_0px_0px_#000]" style={{ borderRadius: '0.75rem' }}>
            <div className="h-9 bg-black flex items-center gap-1.5 px-3" style={{ borderRadius: '0.6rem 0.6rem 0 0' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
            </div>
            <div className="p-6 space-y-3">
              <div className="border-2 border-black p-4" style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Stack</p>
                <p className="text-sm font-medium">Go &middot; Next.js &middot; Docker</p>
              </div>
              <div className="border-2 border-black p-4" style={{ backgroundColor: 'var(--ds-yellow)', borderRadius: '0.5rem' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Hosting</p>
                <p className="text-sm font-medium">Self-hosted, own hardware</p>
              </div>
              <div className="border-2 border-black p-4 bg-white" style={{ borderRadius: '0.5rem' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Build process</p>
                <p className="text-sm font-medium">AI-assisted, documented end to end</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects - Bento Feature Grid */}
      <section id="projects" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000]"
                    style={{ borderRadius: '0.75rem' }}
                  >
                    <div
                      className="w-14 h-14 flex items-center justify-center mb-5 border-2 border-black transition-colors"
                      style={{ backgroundColor: 'var(--ds-sage)', borderRadius: '0.5rem' }}
                    >
                      <ProjectIcon slug={project.icon} />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-3" style={{ fontFamily: 'var(--ds-font-display)' }}>{project.title}</h3>
                    <p className="text-sm text-[var(--ds-charcoal)]/80 leading-relaxed mb-5">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tech_stack.map((tech) => (
                        <span key={tech} className="text-xs font-bold px-2.5 py-1 border-2 border-black" style={{ borderRadius: '0.375rem' }}>
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm font-bold">
                      <a href={formatUrl(project.live_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        Live
                      </a>
                      <a href={formatUrl(project.github_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Source
                      </a>
                    </div>
                  </div>
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
                    {post.description && <p className="text-sm text-[var(--ds-charcoal)]/80 leading-relaxed mb-3 line-clamp-2">{post.description}</p>}
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
