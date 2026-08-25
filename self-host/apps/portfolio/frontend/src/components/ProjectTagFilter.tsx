'use client';

import { Tags, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const menuContentClass =
  'border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1 min-w-[12rem]';

// A dropdown checkbox multiselect - matches the admin "Columns" picker in
// ResumeRequests.tsx - rather than a flat row of toggle pills, which reads
// as a single-pick control even though it's always allowed multiple tags.
export default function ProjectTagFilter({
  tags,
  activeTags,
  onToggle,
}: {
  tags: string[];
  activeTags: Set<string>;
  onToggle: (tag: string | null) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-sm hover:bg-black/5 transition-colors"
            style={{ borderRadius: '0.5rem' }}
          >
            <Tags className="w-3.5 h-3.5" aria-hidden="true" />
            Tags
            {activeTags.size > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 text-[10px] bg-black text-white"
                style={{ borderRadius: '999px' }}
              >
                {activeTags.size}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className={menuContentClass}>
        {tags.map((tag) => (
          <DropdownMenuCheckboxItem key={tag} checked={activeTags.has(tag)} onCheckedChange={() => onToggle(tag)}>
            {tag}
          </DropdownMenuCheckboxItem>
        ))}
        {activeTags.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggle(null)}>Clear tag filters</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
