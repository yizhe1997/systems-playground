'use client';

// Deliberately a loud segmented toggle, not a buried <select> - burying it
// caused real confusion once already with the Featured checkbox (items
// silently not appearing where expected). Draft items don't show up
// anywhere on the public site regardless of Featured, so this needs to be
// the least missable control on the row.
export default function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isPublished = value === 'published';
  return (
    <div className="inline-flex border-2 border-black shrink-0" style={{ borderRadius: '0.375rem' }} role="group" aria-label="Status">
      <button
        type="button"
        onClick={() => onChange('draft')}
        disabled={disabled}
        aria-pressed={!isPublished}
        className={`px-2.5 h-9 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
          !isPublished ? 'bg-[var(--ds-yellow)] text-black' : 'bg-white text-[var(--ds-charcoal)]/50 hover:text-black'
        }`}
        style={{ borderRadius: '0.1875rem 0 0 0.1875rem' }}
      >
        Draft
      </button>
      <button
        type="button"
        onClick={() => onChange('published')}
        disabled={disabled}
        aria-pressed={isPublished}
        className={`px-2.5 h-9 text-xs font-bold border-l-2 border-black transition-colors disabled:cursor-not-allowed ${
          isPublished ? 'bg-black text-white' : 'bg-white text-[var(--ds-charcoal)]/50 hover:text-black'
        }`}
        style={{ borderRadius: '0 0.1875rem 0.1875rem 0' }}
      >
        Published
      </button>
    </div>
  );
}
