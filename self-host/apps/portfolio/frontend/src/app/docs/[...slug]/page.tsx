'use client';
import { use, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchJson } from '@/lib/fetch-json';

type Document = {
  id: string;
  title: string;
  description: string;
  folder_path: string;
  source_type: string;
  content_target: string;
};

export default function DocumentViewer({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const [content, setContent] = useState<string>('');
  const [docMeta, setDocMeta] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = slug[slug.length - 1]; // Assume the last part of the URL is the unique ID

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Find document metadata from Redis registry
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
        const docs = await fetchJson<Document[]>('/api/documents');

        const targetDoc = docs.find(d => d.id === id);
        if (!targetDoc) {
          setError('Document not found in registry.');
          setLoading(false);
          return;
        }

        setDocMeta(targetDoc);

        // 2. Fetch the actual markdown content based on Source Type
        let rawMarkdown = '';
        if (targetDoc.source_type === 'external_url') {
          // Source A: Direct GitHub Raw Fetch
          const mkRes = await fetch(targetDoc.content_target);
          if (!mkRes.ok) throw new Error('Failed to fetch external markdown');
          rawMarkdown = await mkRes.text();
        } else if (targetDoc.source_type === 'native') {
          // Source B: Internal Filebrowser Proxy Fetch
          const mkRes = await fetch(`${apiUrl}/api/docs/raw${targetDoc.content_target}`);
          if (!mkRes.ok) throw new Error('Failed to fetch native markdown from storage');
          rawMarkdown = await mkRes.text();
        } else {
          throw new Error('Unknown source_type configured for this document');
        }

        setContent(rawMarkdown);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An unexpected error occurred while loading the document.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id]);

  if (loading) return <div role="status" aria-live="polite" className="text-sm font-bold text-[var(--ds-charcoal)]/70">Loading document&hellip;</div>;
  if (error) return (
    <div
      role="alert"
      className="text-[var(--ds-charcoal)] p-6 bg-[var(--ds-yellow)] border-2 border-black"
      style={{ borderRadius: '0.75rem' }}
    >
      <p className="font-bold">Couldn&apos;t load that document</p>
      <p className="text-sm mt-1">{error}</p>
    </div>
  );

  return (
    <article className="max-w-none">
      <div className="mb-10 pb-8 border-b-2 border-black">
        <h1
          className="text-3xl lg:text-4xl mb-4 leading-tight text-black"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          {docMeta?.title}
        </h1>
        <p className="text-lg text-[var(--ds-charcoal)]/80 font-medium">{docMeta?.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className="px-3 py-1 text-xs font-bold uppercase tracking-wider border-2 border-black"
            style={{ backgroundColor: docMeta?.source_type === 'external_url' ? 'var(--ds-yellow)' : 'var(--ds-sage)', borderRadius: '0.5rem' }}
          >
            {docMeta?.source_type === 'external_url' ? 'External source' : 'Native CMS'}
          </span>
          <span className="text-xs font-bold px-2 py-1 border-2 border-black" style={{ borderRadius: '0.5rem' }}>
            {docMeta?.folder_path}
          </span>
        </div>
      </div>

      <div className="prose prose-headings:font-extrabold prose-a:text-black prose-a:underline prose-pre:bg-[var(--ds-charcoal)] prose-pre:text-white prose-pre:border-2 prose-pre:border-black mt-8 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
