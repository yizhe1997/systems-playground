'use client';

// One slot in the homepage Blog grid when there's nothing published yet -
// same solid border, yellow hard shadow, and press-hover as a populated
// BlogCard (unlike EmptyProjectCard's dashed border - that's this
// component family's own empty-state convention, ported verbatim from the
// Claude Design template).
export default function EmptyBlogCard() {
  return (
    <div
      className="relative border-2 border-black bg-white shadow-[8px_8px_0px_0px_var(--ds-yellow)] hover:shadow-none transition-[transform,box-shadow] duration-150 hover:translate-x-1 hover:translate-y-1"
      style={{ borderRadius: '0 0.75rem 0.75rem 0.75rem' }}
    >
      <div
        className="aspect-video w-full flex items-center justify-center border-b-2 border-black"
        style={{ borderRadius: '0 0.65rem 0 0', backgroundColor: 'var(--ds-sage)' }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2} style={{ opacity: 0.35 }} aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 7h7M9 11h7" strokeLinecap="round" />
        </svg>
      </div>
      <div className="p-5">
        <h3 className="font-extrabold text-base mb-1" style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-charcoal)' }}>
          Nothing published yet
        </h3>
        <p className="text-sm" style={{ color: 'var(--ds-charcoal)', opacity: 0.55 }}>
          Check back soon
        </p>
      </div>
    </div>
  );
}
