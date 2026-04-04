'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/api/documents')
      .then(res => res.json())
      .then((data: Document[]) => {
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
        <h4 className="font-bold text-foreground uppercase tracking-wider text-xs mb-2 mt-4 flex items-center gap-2">
          📁 {node.name}
        </h4>
      )}
      <ul className="space-y-2 border-l-2 border-border ml-2 pl-4">
        {node.docs.map(doc => (
          <li key={doc.id}>
            <Link href={`/docs/${doc.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors block py-1">
              📄 {doc.title}
            </Link>
          </li>
        ))}
      </ul>
      {Object.values(node.subfolders).map(sub => renderTree(sub))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row gap-12 items-start min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 border border-border bg-card rounded-xl p-6 shadow-sm sticky top-24">
        <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2">Documentation</h3>
        <div className="overflow-y-auto max-h-[60vh] -ml-4">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground ml-4 italic mt-4">No documents found.</p>
          ) : (
            renderTree(tree)
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full bg-card border border-border rounded-xl p-8 md:p-12 shadow-sm prose prose-slate dark:prose-invert max-w-none">
        {children}
      </main>
    </div>
  );
}
