'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HeroSection from '@/components/HeroSection';
import ProjectRow, { type Project as ProjectRowType } from '@/components/ProjectRow';
import EmptyProjectCard from '@/components/EmptyProjectCard';
import BlogCard from '@/components/BlogCard';
import EmptyBlogCard from '@/components/EmptyBlogCard';
import CopySectionLinkButton from '@/components/CopySectionLinkButton';
import LEDTicker from '@/components/originkit/pixel-led-display';
import { useResumeRequest } from '@/components/ResumeRequestModal';
import { fetchJson } from '@/lib/fetch-json';

type Project = ProjectRowType & { featured: boolean };

type Post = {
  id: string;
  title: string;
  cover_image_url: string;
  published_date: string;
  featured: boolean;
  rating_sum: number;
  rating_count: number;
};

type CreditItem = { text: string; url: string };
type CreditRow = { id: string; label: string; items: CreditItem[] };

const DEFAULT_HERO_DESCRIPTION =
  'Self-hosted infrastructure, actually running — with AI as a working collaborator, not a gimmick.';

const DEFAULT_JOB_TITLES = ['BACKEND / PLATFORM ENGINEER'];

export default function Home() {
  const { open: openResumeRequest } = useResumeRequest();
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);

  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');
  const [heroDescription, setHeroDescription] = useState<string>(DEFAULT_HERO_DESCRIPTION);
  const [jobTitles, setJobTitles] = useState<string[]>(DEFAULT_JOB_TITLES);

  const formatUrl = (url: string) => {
    if (!url || url === '#') return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  useEffect(() => {
    const loadOtherData = async () => {
      try {
        const [configRes, projectsRes, postsRes, creditsRes] = await Promise.allSettled([
          fetchJson<{ resumeUrl?: string; linkedinUrl?: string; githubUrl?: string; heroDescription?: string; jobTitles?: string[] }>('/api/config'),
          fetchJson<Project[]>('/api/projects'),
          fetchJson<Post[]>('/api/posts'),
          fetchJson<CreditRow[]>('/api/credits'),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value) {
          if (configRes.value.linkedinUrl) setLinkedinUrl(configRes.value.linkedinUrl);
          if (configRes.value.githubUrl) setGithubUrl(configRes.value.githubUrl);
          if (configRes.value.heroDescription) setHeroDescription(configRes.value.heroDescription);
          if (Array.isArray(configRes.value.jobTitles)) setJobTitles(configRes.value.jobTitles);
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

  const filteredProjects = projects.filter(p => p.featured).slice(0, 3);
  const filteredPosts = posts.filter(p => p.featured).slice(0, 4);

  return (
    <div className="min-h-screen text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />

      <main>
      <HeroSection
        description={heroDescription}
        jobTitles={jobTitles}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        onRequestResume={openResumeRequest}
      />

      {/* Featured Projects - Bento Feature Grid */}
      <section id="projects" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-baseline justify-between gap-6 flex-wrap mb-2">
            <h2
              className="group/heading inline-flex items-baseline gap-1.5 text-3xl sm:text-4xl text-black"
              style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              <a href="#projects" className="hover:opacity-70 transition-opacity">FEATURED PROJECTS</a>
              <sup className="text-sm font-mono font-medium text-[var(--ds-charcoal)]/50" style={{ top: '-0.6em' }}>
                ({projects.length})
              </sup>
              <CopySectionLinkButton sectionId="projects" label="Projects" />
            </h2>
            <Link href="/projects" data-cursor-label="Browse" className="group inline-flex items-center gap-1.5 font-bold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
              <span className="relative">
                Browse all projects
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-black origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-base font-medium text-[var(--ds-charcoal)]/60 mb-9">
            Take a look around — here&apos;s what I&apos;ve been building.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, i) => (
              <ProjectRow key={project.id} project={project} index={i} />
            ))}
            {Array.from({ length: Math.max(0, 3 - filteredProjects.length) }).map((_, i) => (
              <EmptyProjectCard key={`empty-${i}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Blog - dark charcoal section for contrast */}
      <section id="blog" className="border-y-2 border-black" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-baseline justify-between gap-6 flex-wrap mb-2">
            <h2
              className="group/heading inline-flex items-baseline gap-1.5 text-3xl sm:text-4xl text-white"
              style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              <a href="#blog" className="hover:opacity-70 transition-opacity">BLOG</a>
              <sup className="text-sm font-mono font-medium text-white/50" style={{ top: '-0.6em' }}>
                ({posts.length})
              </sup>
              <CopySectionLinkButton sectionId="blog" label="Blog" />
            </h2>
            <Link href="/blog" data-cursor-label="Browse" className="group inline-flex items-center gap-1.5 font-bold shrink-0 text-[var(--ds-yellow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <span className="relative">
                Browse all posts
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-[var(--ds-yellow)] origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-base font-medium text-white/60 mb-9">
            Nothing to do? Wanna read some blogs?
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {filteredPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
            {Array.from({ length: Math.max(0, 4 - filteredPosts.length) }).map((_, i) => (
              <EmptyBlogCard key={`empty-${i}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Credits - production notes, untitled by design; a light-gray band
          between Blog and the dark Footer rather than a third dark section
          in a row. */}
      <section id="credits" className="border-y-2 border-black" style={{ backgroundColor: 'var(--ds-sage)' }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          {credits.length === 0 ? (
            // No custom separator - the component's own small built-in gap
            // between repeats (a few blank columns) is enough at this full
            // width. A bigger padded gap (tried earlier) left a stretch of
            // the band with no text at all in view; this keeps the strip
            // continuous, usually with a second repeat's edge already
            // visible before the first one fully exits.
            <div className="h-12">
              <LEDTicker
                items={['No credits available yet']}
                separator=""
                onColor="rgba(23, 30, 25, 0.45)"
                offColor="rgba(0, 0, 0, 0)"
                textSize={34}
                dotSize={5}
                dotQuantity={10}
                speed={24}
              />
            </div>
          ) : (
            // One shared grid (not one grid per row) so every row's label
            // column lines up on the same right edge and every value column
            // starts flush on the same left edge - grid-cols-[auto_auto]
            // sizes each column to its own widest cell instead of a fixed
            // px guess. w-fit then shrinks the whole grid down to that
            // natural content width, so mx-auto centers the compact
            // label+value block as a unit instead of centering an
            // invisible box that's wider than what's actually drawn in it.
            <div className="mx-auto w-fit grid grid-cols-[auto_auto] gap-x-6 gap-y-3 items-baseline">
              {credits.map((row) => (
                <Fragment key={row.id}>
                  <span className="text-right text-[var(--ds-charcoal)]/50 text-sm font-medium">{row.label}</span>
                  <div className="flex flex-col gap-1">
                    {row.items.map((item, idx) =>
                      item.url ? (
                        <a
                          key={idx}
                          href={formatUrl(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-cursor-label="Open"
                          className="text-black underline underline-offset-2 decoration-black/30 hover:decoration-black transition-colors text-sm font-bold w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                          {item.text}
                        </a>
                      ) : (
                        <span key={idx} className="text-black text-sm font-bold">{item.text}</span>
                      )
                    )}
                  </div>
                </Fragment>
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
