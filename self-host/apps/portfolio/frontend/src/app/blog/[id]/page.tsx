'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Copy, FileText, Link as LinkIcon } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MDXContent from '@/components/mdx/MDXContent';
import { fetchJson } from '@/lib/fetch-json';
import { formatPublishedDate } from '@/lib/format-date';
import { StarRating, StarRatingInput } from '@/components/StarRating';

type Post = {
  id: string;
  title: string;
  source_type: string;
  content_target: string;
  content: string;
  cover_image_url: string;
  published_date: string;
  rating_sum: number;
  rating_count: number;
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
  const [copiedPage, setCopiedPage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [rateBlocked, setRateBlocked] = useState(false);

  // A reader's own vote is remembered per-post in localStorage so the
  // picker locks into "you already rated this" on repeat visits without a
  // round-trip. The backend also enforces one vote per IP per post per day
  // (see the /rate route) as a cheap backstop for a cleared localStorage or
  // a different browser on the same network - that's the 429 branch below.
  useEffect(() => {
    const stored = localStorage.getItem(`blog-rating-${id}`);
    setMyRating(stored ? Number(stored) : null);
  }, [id]);

  const rate = async (n: number) => {
    if (myRating || submittingRating) return;
    setSubmittingRating(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${url}/api/posts/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: n }),
      });
      if (res.ok) {
        const data: { rating_sum: number; rating_count: number } = await res.json();
        setPost((p) => (p ? { ...p, rating_sum: data.rating_sum, rating_count: data.rating_count } : p));
        localStorage.setItem(`blog-rating-${id}`, String(n));
        setMyRating(n);
      } else if (res.status === 429) {
        setRateBlocked(true);
      }
    } catch {
      // Silently drop - a failed vote isn't worth an error banner on an
      // otherwise-successfully-loaded post page.
    } finally {
      setSubmittingRating(false);
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

  // navigator.clipboard.writeText can reject (denied permission, insecure
  // context, older Safari) - fall back to the legacy execCommand approach
  // rather than failing the click silently.
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const copyPage = async () => {
    if (await copyText(content)) {
      setCopiedPage(true);
      setTimeout(() => setCopiedPage(false), 2000);
    }
  };

  const copyLink = async () => {
    if (await copyText(window.location.href)) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const toolbarButtonClass =
    'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-black bg-white hover:bg-[var(--ds-yellow)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black';

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-20 w-full">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-bold mb-10 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          All posts
        </Link>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70">Loading post&hellip;</p>
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
          <article>
            <div className="mb-6 pb-8 border-b-2 border-black">
              <h1
                className="text-3xl lg:text-4xl mb-4 leading-tight text-black"
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
              >
                {post?.title}
              </h1>
              {post?.published_date && (
                <p className="text-sm font-mono text-[var(--ds-charcoal)]/60">
                  Published on {formatPublishedDate(post.published_date)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-10">
              <button type="button" onClick={copyPage} className={toolbarButtonClass}>
                {copiedPage ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                {copiedPage ? 'Copied!' : 'Copy page'}
              </button>
              <a href={`/blog/${id}/raw`} target="_blank" rel="noopener noreferrer" className={toolbarButtonClass}>
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                View as Markdown
              </a>
              <button type="button" onClick={copyLink} className={toolbarButtonClass}>
                {copiedLink ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <LinkIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                {copiedLink ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            <MDXContent
              source={content}
              proseClassName="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline prose-pre:bg-[var(--ds-charcoal)] prose-pre:text-white prose-pre:border-2 prose-pre:border-black max-w-none"
            />

            <div className="mt-16 pt-8 border-t-2 border-black">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70 mb-3">Rate this post</h2>
              <div className="flex items-center gap-3">
                <StarRatingInput value={myRating ?? 0} onChange={rate} disabled={myRating !== null || rateBlocked || submittingRating} />
                <p className="text-sm text-[var(--ds-charcoal)]/70">
                  {myRating
                    ? `Thanks — you rated this ${myRating} star${myRating === 1 ? '' : 's'}.`
                    : rateBlocked
                      ? "Looks like you've already rated this post recently."
                      : submittingRating
                        ? 'Submitting…'
                        : 'Click a star to rate this post.'}
                </p>
              </div>
              {post && post.rating_count > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating average={post.rating_sum / post.rating_count} count={post.rating_count} size={14} showCount />
                  <span className="text-xs font-mono text-[var(--ds-charcoal)]/50">overall</span>
                </div>
              )}
            </div>

            {(prevPost || nextPost) && (
              <nav aria-label="More posts" className="flex items-stretch gap-4 mt-16 pt-8 border-t-2 border-black">
                {prevPost ? (
                  <Link
                    href={`/blog/${prevPost.id}`}
                    className="group flex-1 flex items-center gap-2 p-4 border-2 border-black hover:bg-[var(--ds-yellow)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    style={{ borderRadius: '0.75rem' }}
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--ds-charcoal)]/60 mb-0.5">Previous</p>
                      <p className="text-sm font-bold truncate group-hover:underline">{prevPost.title}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {nextPost ? (
                  <Link
                    href={`/blog/${nextPost.id}`}
                    className="group flex-1 flex items-center justify-end gap-2 p-4 border-2 border-black text-right hover:bg-[var(--ds-yellow)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    style={{ borderRadius: '0.75rem' }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--ds-charcoal)]/60 mb-0.5">Next</p>
                      <p className="text-sm font-bold truncate group-hover:underline">{nextPost.title}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </nav>
            )}
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
