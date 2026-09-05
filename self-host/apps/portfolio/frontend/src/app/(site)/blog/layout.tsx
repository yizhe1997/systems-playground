'use client';

import BlogIpadFrame from '@/components/BlogIpadFrame';
import { useIsLargeScreen } from '@/hooks/use-large-screen';

// Shared across /blog and /blog/[id] - the iPad frame is route-segment chrome, not something each
// page should reimplement. Opening a post from the index keeps it inside the same device instead
// of breaking out into a plain page. Each page still owns its own inner max-width (the index is
// wider than a single article), since that's content-specific, not chrome. SiteHeader/SiteFooter
// live one level up in the shared (site) route group layout now, not here - this used to have its
// own copies, which meant every OTHER page (home, projects, about, ...) still remounted them on
// navigating away from /blog, since this layout only covered /blog and /blog/[id].
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const isLargeScreen = useIsLargeScreen();

  return (
      // Sage is the surface the device sits ON, not the device's own case color (that's
      // ds-yellow, set inside BlogIpadFrame) - two distinct colors for two distinct things.
      // Less top padding than the unframed layout - the device itself is already a large,
      // visually heavy object, so the same py-20 that suits a plain content column read as too
      // much empty space above it.
      <main
        className="flex-1 px-6 pb-20 w-full bg-white"
        style={isLargeScreen ? { backgroundColor: 'var(--ds-sage)', paddingTop: '2rem' } : { paddingTop: '5rem' }}
      >
        {isLargeScreen ? <BlogIpadFrame>{children}</BlogIpadFrame> : children}
      </main>
  );
}
