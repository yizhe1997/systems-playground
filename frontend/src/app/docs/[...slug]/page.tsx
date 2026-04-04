'use client';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Document = {
  id: string;
  title: string;
  description: string;
  folder_path: string;
  source_type: string;
  content_target: string;
};

export default function DocumentViewer({ params }: { params: { slug: string[] } }) {
  const [content, setContent] = useState<string>('');
  const [docMeta, setDocMeta] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.slug[params.slug.length - 1]; // Assume the last part of the URL is the unique ID

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Find document metadata from Redis registry
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
        const resList = await fetch(`${apiUrl}/api/documents`);
        const docs: Document[] = await resList.json();
        
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

  if (loading) return <div className="animate-pulse flex items-center gap-3 text-muted-foreground"><span className="text-xl">⌛</span> Loading engineering document...</div>;
  if (error) return <div className="text-destructive p-6 bg-destructive/10 rounded-xl border border-destructive/20 shadow-sm flex items-center gap-3"><span className="text-2xl">⚠️</span> {error}</div>;

  return (
    <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80 prose-pre:bg-slate-900 prose-pre:text-slate-50">
      <div className="mb-10 pb-8 border-b border-border">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground mb-4 leading-tight">{docMeta?.title}</h1>
        <p className="text-xl text-muted-foreground font-medium">{docMeta?.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${docMeta?.source_type === 'external_url' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20'}`}>
            {docMeta?.source_type === 'external_url' ? '🔗 External Source (Read-Only)' : '💾 Native CMS'}
          </span>
          <span className="text-xs text-muted-foreground font-mono bg-accent px-2 py-1 rounded border border-border">Folder: {docMeta?.folder_path}</span>
        </div>
      </div>
      
      <div className="mt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
