'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { fetchJson } from '@/lib/fetch-json';

type Document = {
  id: string;
  title: string;
  description: string;
  folder_path: string;
  source_type: string;
  content_target: string;
};

type FolderNode = {
  name: string;
  path: string;
  docs: Document[];
  subfolders: { [key: string]: FolderNode };
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [tree, setTree] = useState<FolderNode>({ name: 'root', path: '/', docs: [], subfolders: {} });

  useEffect(() => {
    fetchJson<Document[]>('/api/documents')
      .then((data) => {
        setDocs(data || []);

        // Build virtual folder tree
        const root: FolderNode = { name: 'root', path: '/', docs: [], subfolders: {} };
        (data || []).forEach(doc => {
          const parts = doc.folder_path.split('/').filter(Boolean);
          let current = root;
          let currentPath = '';

          parts.forEach(part => {
            currentPath += '/' + part;
            if (!current.subfolders[part]) {
              current.subfolders[part] = { name: part, path: currentPath, docs: [], subfolders: {} };
            }
            current = current.subfolders[part];
          });
          current.docs.push(doc);
        });
        setTree(root);
      })
      .catch(console.error);
  }, []);

  const renderTree = (node: FolderNode) => (
    <div key={node.path} className="ml-4 mt-2">
      {node.name !== 'root' && (
        <h4 className="font-bold uppercase tracking-wider text-xs mb-2 mt-4 text-[var(--ds-charcoal)]">
          {node.name}
        </h4>
      )}
      <ul className="space-y-2 border-l-2 border-black ml-2 pl-4">
        {node.docs.map(doc => (
          <li key={doc.id}>
            <Link href={`/docs/${doc.id}`} className="text-sm font-medium text-[var(--ds-charcoal)]/80 hover:text-black hover:underline transition-colors flex items-center min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-black">
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
      {Object.values(node.subfolders).map(sub => renderTree(sub))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--ds-charcoal)]" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SiteHeader />
      <div className="flex-1 max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row gap-10 items-start w-full">
      {/* Sidebar Navigation */}
      <aside
        className="w-full md:w-64 shrink-0 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_#000] sticky top-24"
        style={{ borderRadius: '0.75rem' }}
      >
        <h3
          className="text-lg mb-4 text-black border-b-2 border-black pb-2"
          style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}
        >
          Documentation
        </h3>
        <div role="status" aria-live="polite" className="overflow-y-auto max-h-[60vh] -ml-4">
          {docs.length === 0 ? (
            <p className="text-sm text-[var(--ds-charcoal)]/70 ml-4 italic mt-4">No documents found.</p>
          ) : (
            renderTree(tree)
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className="flex-1 min-w-0 w-full bg-white border-2 border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_#000] prose max-w-none"
        style={{ borderRadius: '0.75rem' }}
      >
        {children}
      </main>
      </div>
      <SiteFooter />
    </div>
  );
}
