// Shared rotating spinner glyph (user-supplied, not a lucide icon) plus an optional label -
// reused by BlogCard's cover-image loading state and BlogIpadFrame's screensaver loading state,
// so both read as the same "this site's loading indicator" rather than two different spinners.
export default function LoadingSpinner({ label, size = 44 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ fill: 'var(--ds-yellow)' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z">
          <animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite" />
        </path>
      </svg>
      {label && (
        <span className="text-xs font-mono font-bold tracking-wider" style={{ color: 'var(--ds-yellow)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
