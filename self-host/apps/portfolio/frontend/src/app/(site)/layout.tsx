'use client';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// Shared chrome for every public-facing page (home, projects, about, privacy, terms, blog, resume
// status) - a route group (invisible in the URL) rather than a real segment, so `/projects` stays
// `/projects`. Previously every page.tsx declared its own SiteHeader/SiteFooter, which meant both
// remounted on every client-side navigation between pages (they aren't behind any shared layout) -
// most visibly, SiteFooter's Social column (populated from an async fetch) replayed its pop-in
// entrance animation and briefly showed the wrong column layout on every single page change, not
// just on first load. Declaring them here once means they mount only on first load and persist
// across navigation within this group, same as admin's own separate chrome persists across its
// own routes. flex flex-col + min-h-screen is what makes SiteFooter stick to the bottom on a page
// short enough not to fill the viewport - each page's own <main> just needs flex-1 for that to
// work, which every page here already has.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
