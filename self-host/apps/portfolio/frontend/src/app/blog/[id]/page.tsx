'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { fetchJson } from '@/lib/fetch-json';
import { formatPublishedDate } from '@/lib/format-date';

type Post = {
  id: string;
  title: string;
  description: string;
  source_type: string;
  content_target: string;
  content: string;
  cover_image_url: string;
  published_date: string;
};

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [content, setContent] = useState<string>('');
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            {post?.cover_image_url && (
              <div className="aspect-video w-full overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_#000] mb-10" style={{ borderRadius: '0.75rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="mb-10 pb-8 border-b-2 border-black">
              <h1
                className="text-3xl lg:text-4xl mb-4 leading-tight text-black"
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
              >
                {post?.title}
              </h1>
              {post?.description && <p className="text-lg text-[var(--ds-charcoal)]/80 font-medium">{post.description}</p>}
              {post?.published_date && (
                <p className="text-sm font-mono text-[var(--ds-charcoal)]/60 mt-4">
                  Published on {formatPublishedDate(post.published_date)}
                </p>
              )}
            </div>

            <div className="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline prose-pre:bg-[var(--ds-charcoal)] prose-pre:text-white prose-pre:border-2 prose-pre:border-black mt-8 max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
