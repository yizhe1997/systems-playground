'use client';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/Shared';
import { FolderOpen } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 min-h-screen">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition mb-8 group">
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </Link>
      
      <EmptyState 
        icon={FolderOpen}
        title="It's empty at the moment..."
        subtitle="Real-world applications are currently in development."
      />
    </div>
  );
}
