'use client';

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
    <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter projects by tag">
      {tags.map((tag) => {
        const active = activeTags.has(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            aria-pressed={active}
            className={`text-[11px] font-bold px-2.5 py-1.5 border-2 border-black transition-colors ${
              active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'
            }`}
            style={{ borderRadius: '0.35rem' }}
          >
            {tag}
          </button>
        );
      })}
      {activeTags.size > 0 && (
        <button
          onClick={() => onToggle(null)}
          className="text-[11px] font-bold px-2.5 py-1.5 text-[var(--ds-charcoal)]/60 hover:text-[var(--ds-charcoal)] underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
