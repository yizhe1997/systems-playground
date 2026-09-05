import { fetchJson } from '@/lib/fetch-json';

export type SiteConfig = {
  resumeUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  heroDescription?: string;
  jobTitles?: string[];
  bio?: string;
};

let cached: SiteConfig | null = null;
let inflight: Promise<SiteConfig> | null = null;

// Fetches /api/config once per page session and reuses the result for every caller after that -
// the homepage and SiteFooter both read overlapping fields from this same endpoint, and without
// this each one fired its own independent request. Worse, SiteFooter isn't behind a shared layout
// (it's re-declared in every page.tsx), so it remounts - and refetches from scratch - on every
// client-side navigation between pages, which is what made its Social column visibly reload and
// pop in again each time instead of just once per visit.
export function getSiteConfig(): Promise<SiteConfig> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetchJson<SiteConfig>('/api/config')
      .then((data) => {
        cached = data || {};
        inflight = null;
        return cached;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}
