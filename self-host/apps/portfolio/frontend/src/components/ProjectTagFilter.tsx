'use client';

import { useEffect, useRef, useState } from 'react';
import { Tags, ChevronDown } from 'lucide-react';

const menuContentClass =
  'border-2 border-black rounded-[0.5rem] shadow-[4px_4px_0px_0px_#000] bg-white text-[var(--ds-charcoal)] p-1 min-w-[12rem]';

// Hand-rolled (useState + pointerdown click-outside) rather than Base UI's DropdownMenu - matches
// blog's own sort-filter dropdown exactly (see BlogIndex in app/blog/page.tsx) so both dropdowns
// share the same bordered-menu look AND the same ds-yellow hover feedback on items, which the
// DropdownMenu primitives never had (they only styled :focus, defaulting to a generic gray).
export default function ProjectTagFilter({
  tags,
  activeTags,
  onToggle,
}: {
  tags: string[];
  activeTags: Set<string>;
  onToggle: (tag: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (tags.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-sm hover:bg-[var(--ds-yellow)] transition-colors"
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
      {open && (
        <div className={`absolute left-0 top-full mt-1 z-10 ${menuContentClass}`} role="menu">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              role="menuitemcheckbox"
              aria-checked={activeTags.has(tag)}
              onClick={() => onToggle(tag)}
              className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-[var(--ds-yellow)] transition-colors"
              style={{ fontWeight: activeTags.has(tag) ? 700 : 400 }}
            >
              {tag}
            </button>
          ))}
          {activeTags.size > 0 && (
            <>
              <div className="my-1 border-t border-black/10" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggle(null);
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-[var(--ds-yellow)] transition-colors"
              >
                Clear tag filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
