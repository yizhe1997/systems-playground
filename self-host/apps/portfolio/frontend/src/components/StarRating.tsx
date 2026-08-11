'use client';

const STAR_PATH = 'M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7-5.4-4.7 7.1-.6z';

// Read-only display of a reader-accumulated rating - average is rounded to
// the nearest whole star for the fill, count is how many readers voted.
// Renders nothing when count is 0 rather than five empty outlines - an
// unrated post shouldn't visually compete with rated ones, and there's no
// meaningful "average" of zero votes to show.
export function StarRating({ average, count, size = 13, showCount = false }: { average: number; count: number; size?: number; showCount?: boolean }) {
  if (!count) return null;
  const filled = Math.round(average);
  return (
    <div className="flex items-center gap-1.5 shrink-0 pt-0.5" aria-label={`Rated ${average.toFixed(1)} out of 5 from ${count} reader${count === 1 ? '' : 's'}`}>
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" stroke="#000" strokeWidth={1.5} aria-hidden="true">
            <path d={STAR_PATH} fill={i < filled ? 'var(--ds-yellow)' : 'none'} />
          </svg>
        ))}
      </div>
      {showCount && <span className="text-[11px] font-mono text-[var(--ds-charcoal)]/50">({count})</span>}
    </div>
  );
}

// Editable, 1-5. Clicking the already-selected star clears the rating back
// to 0 (toggle), since 0 is a valid "unrated" state and there's otherwise no
// way to get back to it once a star's been picked.
export function StarRatingInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          disabled={disabled}
          onClick={() => onChange(value === n ? 0 : n)}
          className="disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width={22} height={22} viewBox="0 0 24 24" stroke="#000" strokeWidth={1.5}>
            <path d={STAR_PATH} fill={n <= value ? 'var(--ds-yellow)' : 'none'} />
          </svg>
        </button>
      ))}
    </div>
  );
}
