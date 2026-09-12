'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/icons/social';
import { getSiteConfig } from '@/lib/site-config';
import { useMcpConnect } from '@/components/McpConnectModal';
import { POP_HIDDEN, POP_VISIBLE } from '@/lib/motion';

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
  const { open: openMcpConnect } = useMcpConnect();

  useEffect(() => {
    getSiteConfig()
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
        {/* layout on this grid and every direct child animates the reflow when the Social column
            (below) mounts/unmounts - without it, the grid's own column template switching
            (3 cols -> 4 cols once /api/config resolves) snapped the Explore/Legal columns to their
            new width instantly, on top of Social itself just popping in with no transition at all. */}
        <motion.div
          layout
          className={`grid grid-cols-2 ${hasSocial ? 'sm:grid-cols-[2fr_1fr_1fr_1fr]' : 'sm:grid-cols-[2fr_1fr_1fr]'} gap-10 mb-14`}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div layout className="col-span-2 sm:col-span-1 max-w-sm">
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
            <p className="text-sm text-[var(--ds-sage)] mb-4">
              Made for recruiters. Overbuilt for fun.
            </p>
            <button
              type="button"
              onClick={() => openMcpConnect()}
              data-cursor-label="Open"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white/70 hover:text-white hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Talk to this portfolio
            </button>
          </motion.div>

          <motion.div layout>
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
          </motion.div>

          <motion.div layout>
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
          </motion.div>

          {/* Pops into existence (same language as the homepage's Featured Projects/Blog cards)
              once /api/config resolves and confirms a social link is actually configured - AnimatePresence
              handles the mount transition, and `layout` (here and on the columns above) is what
              makes the OTHER columns glide to their new width instead of snapping when the grid's
              own column template switches from 3 to 4 columns. */}
          <AnimatePresence>
            {hasSocial && (
              <motion.div
                layout
                key="social"
                initial={POP_HIDDEN}
                animate={POP_VISIBLE}
                exit={POP_HIDDEN}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm text-white/50">&copy; 2026 Chin Yi Zhe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
