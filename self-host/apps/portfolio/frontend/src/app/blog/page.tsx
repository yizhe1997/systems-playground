'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { fetchJson } from '@/lib/fetch-json';
import { formatPublishedDate } from '@/lib/format-date';

type Post = {
  id: string;
  title: string;
  cover_image_url: string;
  published_date: string;
};

export default function BlogIndex() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<Post[]>('/api/posts')
      .then((data) => setPosts(data || []))
      .catch((err) => console.error('Failed to load posts:', err))
      .finally(() => setLoading(false));
  }, []);

  // Newest first by published_date; posts without a date keep their admin
  // (array) order and sort after every dated post - a post you haven't
  // dated yet shouldn't jump to the top just because Date('') is falsy-low.
  const sorted = [...posts].sort((a, b) => {
    if (a.published_date && b.published_date) return b.published_date.localeCompare(a.published_date);
    if (a.published_date) return -1;
    if (b.published_date) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-20 w-full">
        <h1
          className="mb-12 text-black"
          style={{
            fontFamily: 'var(--ds-font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          Blog
        </h1>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70">Loading&hellip;</p>
        ) : sorted.length === 0 ? (
          <div
            className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_#000] max-w-md"
            style={{ borderRadius: '0.75rem' }}
          >
            <p className="font-bold mb-1">Nothing published yet</p>
            <p className="text-sm text-[var(--ds-charcoal)]/70">Write-ups land here as they&apos;re published.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {sorted.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="group block bg-white border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
                  <h2 className="text-lg font-extrabold mb-2 group-hover:underline">{post.title}</h2>
                  {post.published_date && (
                    <p className="text-xs font-mono text-[var(--ds-charcoal)]/60">
                      Published on {formatPublishedDate(post.published_date)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
