'use client';
import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Copy, FileText, Link as LinkIcon, MoreHorizontal, Heart, Eye, X, Sun, Moon } from 'lucide-react';
import MDXContent from '@/components/mdx/MDXContent';
import { fetchJson } from '@/lib/fetch-json';
import { formatPublishedDate } from '@/lib/format-date';
import { copyText } from '@/lib/copy-text';

type Post = {
  id: string;
  title: string;
  source_type: string;
  content_target: string;
  content: string;
  cover_image_url: string;
  published_date: string;
  love_count: number;
  view_count: number;
};

// Newest first by published_date; posts without a date keep their admin
// (array) order and sort after every dated post - mirrors blog/page.tsx's
// listing order so prev/next here matches what "All posts" shows.
function sortPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    if (a.published_date && b.published_date) return b.published_date.localeCompare(a.published_date);
    if (a.published_date) return -1;
    if (b.published_date) return 1;
    return 0;
  });
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [content, setContent] = useState<string>('');
  const [post, setPost] = useState<Post | null>(null);
  const [prevPost, setPrevPost] = useState<Post | null>(null);
  const [nextPost, setNextPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loved, setLoved] = useState(false);
  const [loving, setLoving] = useState(false);
  const [loveBlocked, setLoveBlocked] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  // The actions dropdown closes itself the instant copyLink/copyPage is clicked, so a "Copied!"
  // label swapped in inside the (now-unmounted) dropdown item would never actually be seen - this
  // toast is the real, visible confirmation instead.
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Shows the post's raw Markdown source inline, in place of the rendered article, instead of
  // opening a separate /raw tab - closed via the X button, and reset whenever the post changes
  // (prev/next) so it doesn't awkwardly persist into a different article.
  const [viewingRaw, setViewingRaw] = useState(false);
  // Dark by default (per request), remembered across visits the same way the love state is -
  // read lazily so SSR/first-paint and a returning reader's actual preference don't fight each
  // other. Only the reading card (title/meta/content) themes - the nav row and dropdown chrome
  // stay as-is, same as how a lot of reading apps keep their toolbar neutral and only flip the
  // page itself.
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('blogpad-dark-mode');
    return saved === null ? true : saved === '1';
  });

  const toggleDarkMode = () => {
    setDarkMode((v) => {
      const next = !v;
      localStorage.setItem('blogpad-dark-mode', next ? '1' : '0');
      return next;
    });
  };

  // A reader's own love is remembered per-post in localStorage so the button locks into
  // "you already loved this" on repeat visits without a round-trip. The backend also enforces one
  // love per IP per post per day (see the /love route) as a cheap backstop for a cleared
  // localStorage or a different browser on the same network - that's the 429 branch below.
  useEffect(() => {
    setLoved(!!localStorage.getItem(`blog-love-${id}`));
    setViewingRaw(false);
  }, [id]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 1800);
  };

  useEffect(() => {
    if (!actionsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) setActionsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [actionsOpen]);

  // Toggles both ways - POST to love, DELETE to unlove - rather than a one-shot "vote once"
  // action. The backend's own concurrency-safety (atomic Incr/Decr on a dedicated Redis key, a
  // SetNX'd per-IP state key as the toggle gate) is what actually makes this safe under
  // concurrent requests; this is just the client half.
  const toggleLove = async () => {
    if (loving) return;
    setLoving(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${url}/api/posts/${id}/love`, { method: loved ? 'DELETE' : 'POST' });
      if (res.ok) {
        const data: { love_count: number; loved: boolean } = await res.json();
        setPost((p) => (p ? { ...p, love_count: data.love_count } : p));
        if (data.loved) {
          localStorage.setItem(`blog-love-${id}`, '1');
        } else {
          localStorage.removeItem(`blog-love-${id}`);
        }
        setLoved(data.loved);
        setLoveBlocked(false);
      } else if (res.status === 429) {
        setLoveBlocked(true);
      }
    } catch {
      // Silently drop - a failed love/unlove isn't worth an error banner on an otherwise-
      // successfully loaded post page.
    } finally {
      setLoving(false);
    }
  };

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const posts = await fetchJson<Post[]>('/api/posts');

        const target = posts.find((p) => p.id === id);
        if (!target) {
          setError('Post not found.');
          setLoading(false);
          return;
        }

        setPost(target);

        const sorted = sortPosts(posts);
        const idx = sorted.findIndex((p) => p.id === id);
        setPrevPost(idx > 0 ? sorted[idx - 1] : null);
        setNextPost(idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null);

        // Fire-and-forget, not blocking content load - the 30min per-IP dedup on the backend
        // means a tight refresh loop doesn't inflate this, but a genuine return visit later does.
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
        fetch(`${apiUrl}/api/posts/${id}/view`, { method: 'POST' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { view_count: number } | null) => {
            if (data) setPost((p) => (p ? { ...p, view_count: data.view_count } : p));
          })
          .catch(() => {});

        let rawMarkdown = '';
        if (target.source_type === 'external_url') {
          const res = await fetch(target.content_target);
          if (!res.ok) throw new Error('Failed to fetch external markdown');
          rawMarkdown = await res.text();
        } else if (target.source_type === 'native') {
          rawMarkdown = target.content;
        } else {
          throw new Error('Unknown source_type configured for this post');
        }

        setContent(rawMarkdown);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading the post.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const copyPage = async () => {
    if (await copyText(content)) {
      showToast('Page copied to clipboard');
    }
  };

  const copyLink = async () => {
    if (await copyText(window.location.href)) {
      showToast('Link copied to clipboard');
    }
  };

  const pagerBtnClass = darkMode
    ? 'p-2 border-2 border-white/30 text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
    : 'p-2 border-2 border-black hover:bg-[var(--ds-yellow)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black';
  const pagerBtnDisabledClass = darkMode
    ? 'p-2 border-2 border-white/10 text-white/20 cursor-not-allowed'
    : 'p-2 border-2 border-black/20 text-black/20 cursor-not-allowed';
  const actionItemClass = darkMode
    ? 'w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md text-sm text-white hover:bg-white/10 transition-colors'
    : 'w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md text-sm hover:bg-[var(--ds-yellow)] transition-colors';
  const dropdownClass = darkMode
    ? 'absolute right-0 top-full mt-1 z-10 border-2 border-white/30 rounded-[0.5rem] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] bg-[var(--ds-charcoal)] p-1'
    : 'absolute right-0 top-full mt-1 z-10 border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1';

  return (
    // Bleeds edge-to-edge to fill the device screen's own px-5/pt-4/pb-6 padding when dark, the
    // same -mx-5/-mt-4/-mb-6 trick blog/page.tsx already uses for its own full-bleed panel -
    // otherwise dark mode was just a dark CARD floating in a lingering white margin, not an
    // actually dark screen. Only the status/address bar chrome above (owned by BlogIpadFrame)
    // stays as-is; this is the whole scrollable surface underneath it. The replacement padding
    // (px-5/pt-4/pb-6) deliberately matches the canceled-out margins exactly, unlike blog/page.tsx's
    // own px-6/py-8 - this page's content must sit at the SAME position in both modes, or toggling
    // dark mode visibly shifts the article underneath the reader instead of just repainting it.
    <div
      className={darkMode ? 'relative z-0 -mx-5 -mt-4 -mb-6 px-5 pt-4 pb-6' : ''}
      style={darkMode ? { backgroundColor: 'var(--ds-charcoal)' } : undefined}
    >
    <div className="max-w-3xl mx-auto">
        {/* Blog link, an actions dropdown (copy page / view as markdown / copy link), and a
            compact prev/next pair - all in one row. The actions dropdown sits directly to the
            left of the "<" (prev) button, replacing what used to be its own separate toolbar row
            below the title. Prev/next use plain chevrons ("<"/">") rather than full arrows. Both
            only appear once the post list has loaded; each control disables itself (rather than
            disappearing) when there's nothing to act on yet or nothing in that direction. */}
        <div className="relative flex items-center justify-between mb-10">
          <Link
            href="/blog"
            className={`inline-flex items-center gap-1.5 text-sm font-bold hover:underline focus:outline-none focus-visible:ring-2 ${darkMode ? 'text-white focus-visible:ring-white' : 'focus-visible:ring-black'}`}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Blog
          </Link>
          {!loading && !error && (
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  aria-label="Post actions"
                  data-cursor-label="Actions"
                  className={pagerBtnClass}
                  style={{ borderRadius: '0.5rem' }}
                >
                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                </button>
                {actionsOpen && (
                  <div className={dropdownClass} style={{ minWidth: '11rem' }} role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        copyLink();
                        setActionsOpen(false);
                      }}
                      className={actionItemClass}
                    >
                      <LinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy link
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        copyPage();
                        setActionsOpen(false);
                      }}
                      className={actionItemClass}
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy page
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setViewingRaw(true);
                        setActionsOpen(false);
                      }}
                      className={actionItemClass}
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      View as Markdown
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                data-cursor-label={darkMode ? 'Light mode' : 'Dark mode'}
                className={pagerBtnClass}
                style={{ borderRadius: '0.5rem' }}
              >
                {darkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              </button>
              {prevPost ? (
                <Link href={`/blog/${prevPost.id}`} aria-label={`Previous post: ${prevPost.title}`} data-cursor-label="Prev" className={pagerBtnClass} style={{ borderRadius: '0.5rem' }}>
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </Link>
              ) : (
                <span aria-hidden="true" className={pagerBtnDisabledClass} style={{ borderRadius: '0.5rem' }}>
                  <ChevronLeft className="w-4 h-4" />
                </span>
              )}
              {nextPost ? (
                <Link href={`/blog/${nextPost.id}`} aria-label={`Next post: ${nextPost.title}`} data-cursor-label="Next" className={pagerBtnClass} style={{ borderRadius: '0.5rem' }}>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              ) : (
                <span aria-hidden="true" className={pagerBtnDisabledClass} style={{ borderRadius: '0.5rem' }}>
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          )}
          {/* Centered across the whole row (not tucked under the actions button) and anchored
              here rather than position:fixed on the viewport specifically so it stays inside the
              device's own screen when framed by BlogIpadFrame - fixed-position elements only get
              confined to a transformed ancestor when one actually has an inline transform at that
              moment, which cardRef doesn't until the device has been flipped at least once, so a
              viewport-fixed toast could render outside the screen's rounded/clipped bounds
              entirely. */}
          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-[var(--ds-yellow)] text-[var(--ds-charcoal)] font-bold text-xs shadow-[4px_4px_0px_0px_#000] whitespace-nowrap"
              style={{ borderRadius: '0.5rem' }}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              {toastMessage}
            </div>
          )}
        </div>

        {loading ? (
          <p role="status" aria-live="polite" className={`text-sm font-bold ${darkMode ? 'text-white/70' : 'text-[var(--ds-charcoal)]/70'}`}>Loading post&hellip;</p>
        ) : error ? (
          <div
            role="alert"
            className="text-[var(--ds-charcoal)] p-6 bg-[var(--ds-yellow)] border-2 border-black"
            style={{ borderRadius: '0.75rem' }}
          >
            <p className="font-bold">Couldn&apos;t load that post</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <article className={darkMode ? 'text-white' : ''}>
            <div className={`mb-6 pb-8 border-b-2 ${darkMode ? 'border-white/15' : 'border-black'}`}>
              <h1
                className={`text-3xl lg:text-4xl mb-4 leading-tight ${darkMode ? 'text-white' : 'text-black'}`}
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
              >
                {post?.title}
              </h1>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-mono ${darkMode ? 'text-white/60' : 'text-[var(--ds-charcoal)]/60'}`}>
                  {post?.published_date && `Published on ${formatPublishedDate(post.published_date)}`}
                </p>
                <div className={`flex items-center gap-3 text-sm shrink-0 ${darkMode ? 'text-white/60' : 'text-[var(--ds-charcoal)]/60'}`}>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    {post?.view_count ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={toggleLove}
                    disabled={loving}
                    aria-label={loved ? 'Unlove this post' : 'Love this post'}
                    aria-pressed={loved}
                    data-cursor-label={loved ? 'Unlove' : 'Love'}
                    title={loveBlocked ? "Looks like you've already loved this recently" : undefined}
                    className={`inline-flex items-center gap-1 transition-colors disabled:cursor-not-allowed ${darkMode ? 'hover:text-white' : 'hover:text-black'}`}
                  >
                    <Heart className="w-4 h-4" aria-hidden="true" fill={loved ? 'currentColor' : 'none'} />
                    {post?.love_count ?? 0}
                  </button>
                </div>
              </div>
            </div>

            {viewingRaw ? (
              <div className={`border-2 bg-black/40 ${darkMode ? 'border-white/20' : 'border-black'}`} style={{ borderRadius: '0.75rem' }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-white/10">
                  <span className="text-xs font-mono uppercase tracking-wider text-white/60">Raw Markdown</span>
                  <button
                    type="button"
                    onClick={() => setViewingRaw(false)}
                    aria-label="Close raw Markdown view"
                    data-cursor-label="Close"
                    className="p-1 border-2 border-white/30 hover:border-white text-white/70 hover:text-white transition-colors"
                    style={{ borderRadius: '0.4rem' }}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <pre className="text-xs text-white p-4 whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto">{content}</pre>
              </div>
            ) : (
              <MDXContent
                source={content}
                proseClassName={
                  darkMode
                    ? 'prose prose-invert prose-headings:font-extrabold prose-a:text-white prose-a:underline prose-pre:bg-black prose-pre:text-white prose-pre:border-2 prose-pre:border-white/20 max-w-none'
                    : 'prose prose-headings:font-extrabold prose-a:text-black prose-a:underline prose-pre:bg-[var(--ds-charcoal)] prose-pre:text-white prose-pre:border-2 prose-pre:border-black max-w-none'
                }
              />
            )}
          </article>
        )}
    </div>
    </div>
  );
}
