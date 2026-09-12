'use client';

import { LayoutGrid, Share2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type ViewMode = 'grid' | 'graph';

// Uses the project's real shadcn/base-ui Tabs primitive (src/components/ui/tabs.tsx) rather than
// a hand-rolled button row - just re-themed onto the DS's black-border/charcoal-and-yellow look
// instead of shadcn's default muted-background style, matching how dialog.tsx and
// dropdown-menu.tsx are already customized per-context elsewhere in this codebase. The
// charcoal track + yellow selected pill deliberately echoes the graph view's own charcoal
// background / yellow project-node palette, since Graph is one of the two things this toggle
// switches to.
export default function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ViewMode)} aria-label="Project view">
      {/* The primitive's own base classes set height via a group-scoped selector
          (group-data-horizontal/tabs:h-8) that beats a plain h-auto override on specificity, and
          its focus ring/outline/border default to the shadcn theme's blue --ring token, not this
          site's DS - inline style + explicit black ring/outline/border overrides sidestep both
          rather than fighting the primitive's CSS. */}
      <TabsList
        className="border-2 border-black bg-[var(--ds-charcoal)] gap-0.5 p-0.5 w-auto rounded-[0.5rem]"
        style={{ height: 40 }}
      >
        <TabsTrigger
          value="grid"
          className="justify-center min-w-[5.25rem] rounded-[0.35rem] px-3.5 text-sm font-bold text-white/70 hover:text-white data-active:bg-[var(--ds-yellow)] data-active:text-[var(--ds-charcoal)] data-active:shadow-none focus-visible:border-black focus-visible:ring-black/30 focus-visible:outline-black"
          style={{ height: 32 }}
        >
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          Grid
        </TabsTrigger>
        <TabsTrigger
          value="graph"
          className="justify-center min-w-[5.25rem] rounded-[0.35rem] px-3.5 text-sm font-bold text-white/70 hover:text-white data-active:bg-[var(--ds-yellow)] data-active:text-[var(--ds-charcoal)] data-active:shadow-none focus-visible:border-black focus-visible:ring-black/30 focus-visible:outline-black"
          style={{ height: 32 }}
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
          Graph
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
