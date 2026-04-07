'use client';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/ui/Shared';

export default function DocsIndex() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto py-10">
      <EmptyState 
        icon={BookOpen}
        title="Engineering Documentation"
        subtitle="Select an Architecture Decision Record (ADR) or engineering blog post from the virtual folder tree on the left to begin reading."
      />
    </div>
  );
}
