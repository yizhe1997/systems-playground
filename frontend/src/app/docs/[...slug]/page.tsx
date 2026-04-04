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

  if (loading) return <div className="animate-pulse flex items-center gap-3 text-slate-500"><span className="text-xl">⌛</span> Loading engineering document...</div>;
  if (error) return <div className="text-rose-500 p-6 bg-rose-50 rounded-xl border border-rose-200 shadow-sm flex items-center gap-3"><span className="text-2xl">⚠️</span> {error}</div>;

  return (
    <article className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-pre:bg-slate-900 prose-pre:text-slate-50">
      <div className="mb-10 pb-8 border-b border-slate-200">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">{docMeta?.title}</h1>
        <p className="text-xl text-slate-500 font-medium">{docMeta?.description}</p>
        <div className="mt-6 flex items-center gap-3">
          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${docMeta?.source_type === 'external_url' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {docMeta?.source_type === 'external_url' ? '🔗 External Source (Read-Only)' : '💾 Native CMS'}
          </span>
          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">Folder: {docMeta?.folder_path}</span>
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
