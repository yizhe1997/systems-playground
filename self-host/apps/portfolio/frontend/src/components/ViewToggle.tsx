'use client';

import { LayoutGrid, Share2 } from 'lucide-react';

export type ViewMode = 'grid' | 'graph';

const OPTIONS: { key: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'graph', label: 'Graph', icon: Share2 },
];

export default function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="inline-flex border-2 border-black" style={{ borderRadius: '0.5rem' }} role="tablist" aria-label="Project view">
      {OPTIONS.map(({ key, label, icon: Icon }, i) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold transition-colors ${
              active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'
            } ${i === 0 ? 'border-r-2 border-black' : ''}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
