'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GithubIcon, LinkedinIcon } from '@/components/icons/social';
import { fetchJson } from '@/lib/fetch-json';

const exploreLinks = [
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
];

const isConfigured = (url: string) => !!url && url !== '#';

const formatUrl = (url: string) => {
  if (!url || url === '#') return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

export default function SiteFooter() {
  const [githubUrl, setGithubUrl] = useState<string>('#');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');

  useEffect(() => {
    fetchJson<{ githubUrl?: string; linkedinUrl?: string }>('/api/config')
      .then((data) => {
        if (data?.githubUrl) setGithubUrl(data.githubUrl);
        if (data?.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
      })
      .catch((err) => console.error('Failed to load footer config:', err));
  }, []);

  const hasGithub = isConfigured(githubUrl);
  const hasLinkedin = isConfigured(linkedinUrl);
  const hasSocial = hasGithub || hasLinkedin;

  return (
    <footer className="pt-16 pb-8 border-t-2 border-black" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`grid grid-cols-2 ${hasSocial ? 'sm:grid-cols-[2fr_1fr_1fr_1fr]' : 'sm:grid-cols-[2fr_1fr_1fr]'} gap-10 mb-14`}>
          <div className="col-span-2 sm:col-span-1 max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 flex items-center justify-center bg-[var(--ds-yellow)] text-black text-xs border-2 border-white"
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, borderRadius: '0.5rem' }}
              >
                YZ
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white" style={{ fontFamily: 'var(--ds-font-display)' }}>
                Portfolio
              </span>
            </div>
            <p className="text-sm text-[var(--ds-sage)]">
              A recruiter-facing portfolio, self-hosted and built end to end by one engineer.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-5 text-[var(--ds-yellow)]">Explore</h3>
            <ul className="space-y-3 text-sm">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-cursor-label="Open"
                    className="inline-block py-2.5 -my-2.5 text-white/70 hover:text-white hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-5 text-[var(--ds-yellow)]">Legal</h3>
            <ul className="space-y-3 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-cursor-label="Open"
                    className="inline-block py-2.5 -my-2.5 text-white/70 hover:text-white hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {hasSocial && (
            <div>
              <h3 className="font-bold mb-5 text-[var(--ds-yellow)]">Social</h3>
              <div className="flex gap-4">
                {hasGithub && (
                  <a
                    href={formatUrl(githubUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    data-cursor-label="Open"
                    className="w-11 h-11 flex items-center justify-center bg-[#272727] border-2 border-black text-white hover:bg-[var(--ds-yellow)] hover:text-black transition-colors"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <GithubIcon />
                  </a>
                )}
                {hasLinkedin && (
                  <a
                    href={formatUrl(linkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    data-cursor-label="Open"
                    className="w-11 h-11 flex items-center justify-center bg-[#272727] border-2 border-black text-white hover:bg-[var(--ds-yellow)] hover:text-black transition-colors"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <LinkedinIcon />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm text-white/50">&copy; 2026 Chin Yi Zhe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
