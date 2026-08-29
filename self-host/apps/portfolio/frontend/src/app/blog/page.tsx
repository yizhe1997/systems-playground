'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpDown, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import BlogCard from '@/components/BlogCard';
import EmptyBlogCard from '@/components/EmptyBlogCard';
import CopySectionLinkButton from '@/components/CopySectionLinkButton';
import FoilDrift from '@/components/originkit/foil-drift';
import { fetchJson } from '@/lib/fetch-json';
import { estimateReadingMinutes } from '@/lib/reading-time';

type Post = {
  id: string;
  title: string;
  source_type: string;
  content: string;
  cover_image_url: string;
  published_date: string;
  love_count: number;
  view_count: number;
};

type SortKey = 'newest' | 'oldest' | 'loved';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  loved: 'Most loved',
};

const PAGE_SIZE = 6;

const menuContentClass =
  'border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1';

export default function BlogIndex() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  // Hand-rolled instead of the Base UI Menu this used to be - a plain useState + click-outside
  // listener has zero interaction-library surface area to go wrong, which matters here since this
  // exact control (picking anything other than the first option) was reported stuck more than
  // once despite the underlying state/sort logic checking out clean every time it was tested.
  const [sortOpen, setSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [sortOpen]);

  useEffect(() => {
    fetchJson<Post[]>('/api/posts')
      .then((data) => setPosts(data || []))
      .catch((err) => console.error('Failed to load posts:', err))
      .finally(() => setLoading(false));
  }, []);

  // reading_minutes is only computable for "native" posts - the body is already in this same
  // response. An "external_url" post's body lives at a separate URL; fetching every one of those
  // just to estimate reading time on the list page isn't worth it, so those posts simply don't
  // get a "min read" label (see BlogCardPost.reading_minutes being optional).
  const withReadingTime = useMemo(
    () =>
      posts.map((p) => ({
        ...p,
        reading_minutes: p.source_type === 'native' ? estimateReadingMinutes(p.content) : undefined,
      })),
    [posts]
  );

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? withReadingTime.filter((p) => (p.title || '').toLowerCase().includes(q)) : withReadingTime;

    // Undated posts sort after every dated one regardless of direction - a post you haven't
    // dated yet shouldn't jump to the top just because an empty string compares low.
    return [...filtered].sort((a, b) => {
      if (sortBy === 'loved') return b.love_count - a.love_count;
      if (a.published_date && b.published_date) {
        return sortBy === 'oldest' ? a.published_date.localeCompare(b.published_date) : b.published_date.localeCompare(a.published_date);
      }
      if (a.published_date) return -1;
      if (b.published_date) return 1;
      return 0;
    });
  }, [withReadingTime, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const paged = useMemo(
    () => filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredSorted, page]
  );

  // Reset to page 1 whenever the filtered set's shape changes - during render, same pattern used
  // for this on /projects and in admin's ResumeRequests table.
  const filterKey = `${search}|${sortBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // SiteHeader/SiteFooter and the iPad frame now live in blog/layout.tsx, shared with
  // /blog/[id] - this page only ever renders its own content. The negative margins below cancel
  // out the device screen's own px-5/pt-4/pb-6 padding (BlogIpadFrame) so this panel - and the
  // Foil Drift shimmer behind it - bleeds edge-to-edge as the actual screen background, rather
  // than sitting as an inset card floating inside a white margin. Only the status/address bar
  // "chrome" above stays white; this is the whole page surface underneath it.
  return (
    <div className="relative z-0 -mx-5 -mt-4 -mb-6 px-6 py-8" style={{ backgroundColor: 'var(--ds-charcoal)' }}>
        {/* Foil Drift (Originkit) as the actual screen background - not tucked behind gaps. It's
            pure specular (flakes are invisible except where they catch the light), so it needs
            real tonal contrast to read at all; charcoal (a site DS token, not the component's own
            dark preset) is what it's rendered against here, with gold/sage glints on top.
            `z-0` on the panel above is required, not decorative - without an explicit z-index a
            `position:relative` element doesn't establish its own stacking context, so this
            child's negative z-index escapes upward and gets compared against ANCESTOR content
            instead of staying local, which was silently sinking the whole effect behind opaque
            page chrome regardless of how bright the shader itself rendered. */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <FoilDrift
            background="var(--ds-charcoal)"
            baseColor="#4a5650"
            accentColor="var(--ds-sage)"
            highlight="var(--ds-yellow)"
            density={5500}
            dotSize={95}
            speed={35}
            hover={120}
            flake={{ sharpness: 50, tilt: 140, spread: 85 }}
            style={{ minWidth: 0, minHeight: 0 }}
          />
        </div>

        {/* Capped to max-w-6xl - matches the home page's own Blog section width (same BlogCard
            component, same grid) so cards render at a consistent size instead of stretching to
            fill this now-much-wider landscape screen. The charcoal/shimmer panel above still
            bleeds full width; only the actual reading content is width-capped. */}
        <div className="max-w-6xl mx-auto">
        <h1
          className="group/heading mb-8 inline-flex items-baseline gap-1.5 text-white"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          BLOG
          <sup className="self-start text-sm font-mono font-medium text-white/50">
            ({filteredSorted.length}/{posts.length})
          </sup>
          <CopySectionLinkButton label="Blog page" />
        </h1>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm font-bold text-white/70">Loading&hellip;</p>
        ) : (
          <>
            <div className="flex items-center flex-wrap gap-3 mb-8">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-charcoal)]/40" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title…"
                  aria-label="Search posts by title"
                  className="pl-8 pr-3 py-2 w-56 bg-white border-2 border-black text-sm font-bold placeholder:font-normal placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow"
                  style={{ borderRadius: '0.5rem' }}
                />
              </div>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs font-bold underline text-white/70 hover:text-white transition-colors"
                >
                  Clear search
                </button>
              )}

              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setSortOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-sm hover:bg-[var(--ds-yellow)] transition-colors"
                  style={{ borderRadius: '0.5rem', height: 40 }}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                  {SORT_LABELS[sortBy]}
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {sortOpen && (
                  <div className={`absolute left-0 top-full mt-1 z-10 ${menuContentClass}`} style={{ minWidth: '10rem' }} role="menu">
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sortBy === key}
                        onClick={() => {
                          setSortBy(key);
                          setSortOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-[var(--ds-yellow)] transition-colors"
                        style={{ fontWeight: sortBy === key ? 700 : 400 }}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {paged.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
              {/* Pad up to PAGE_SIZE with empty-state cards - covers "nothing published yet", a
                  search that matched nothing, and a partially-filled last page, all the same way
                  (matches the /projects grid's pattern). */}
              {Array.from({ length: PAGE_SIZE - paged.length }).map((_, i) => (
                <EmptyBlogCard key={`empty-${i}`} />
              ))}
            </div>

            {/* Three-column grid so "Page X of Y" stays centered regardless of nav-cluster width -
                same layout as /projects' pager. */}
            <div className="grid grid-cols-3 items-center gap-4 mt-10">
              <div />
              <span className="text-sm font-bold text-white/70 justify-self-center">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2 justify-self-end">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="Go to first page"
                  className="p-2 border-2 border-black bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--ds-yellow)] transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Go to previous page"
                  className="p-2 border-2 border-black bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--ds-yellow)] transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Go to next page"
                  className="p-2 border-2 border-black bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--ds-yellow)] transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Go to last page"
                  className="p-2 border-2 border-black bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--ds-yellow)] transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
        </div>
    </div>
  );
}
