'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { formatPostmarkStamp } from '@/lib/format-date';
import { StarRating } from '@/components/StarRating';

export type BlogCardPost = {
  id: string;
  title: string;
  cover_image_url: string;
  published_date: string;
  rating_sum: number;
  rating_count: number;
};

// Shared visual body for the card - a cover (image or sage/icon fallback), a
// postmark-style date stamp overlapping the top-right corner, and a
// title/star-rating row. Rendered by both the real BlogCard (wrapped in a
// navigating Link) and BlogCardPreview (wrapped in a plain div for the admin
// panel, which must never navigate away from the editor).
function BlogCardFace({ post }: { post: BlogCardPost }) {
  const stamp = formatPostmarkStamp(post.published_date);

  return (
    <>
      <div
        className="aspect-video w-full overflow-hidden border-b-2 border-black flex items-center justify-center"
        style={{ borderRadius: '0 0.65rem 0 0', backgroundColor: post.cover_image_url ? 'var(--ds-charcoal)' : 'var(--ds-sage)' }}
      >
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <BookOpen className="w-10 h-10 text-black/40" aria-hidden="true" />
        )}
      </div>

      {stamp && (
        <div
          className="absolute flex flex-col items-center justify-center text-center border-2 border-black"
          style={{
            top: '-14px',
            right: '16px',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            backgroundColor: 'var(--ds-yellow)',
            boxShadow: '4px 4px 0px 0px #000',
          }}
        >
          <span className="font-mono font-extrabold text-black" style={{ fontSize: '11px', lineHeight: 1.15 }}>
            {stamp.dayMonth}
          </span>
          <span className="font-mono font-extrabold text-black" style={{ fontSize: '9px', lineHeight: 1, opacity: 0.7 }}>
            {stamp.year}
          </span>
        </div>
      )}

      <div className="p-5 flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold leading-snug">{post.title || 'Untitled post'}</h3>
        <StarRating average={post.rating_count ? post.rating_sum / post.rating_count : 0} count={post.rating_count} />
      </div>
    </>
  );
}

const cardBaseClass =
  'group relative border-2 border-black bg-white shadow-[8px_8px_0px_0px_var(--ds-yellow)]';
const cardStyle = { borderRadius: '0 0.75rem 0.75rem 0.75rem' } as const;

export default function BlogCard({ post }: { post: BlogCardPost }) {
  return (
    <Link
      href={`/blog/${post.id}`}
      data-cursor-label="Read"
      className={`${cardBaseClass} block hover:shadow-none transition-[transform,box-shadow] duration-150 hover:translate-x-1 hover:translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
      style={cardStyle}
    >
      <BlogCardFace post={post} />
    </Link>
  );
}

// Non-navigating variant for the admin "Preview" dialog - same face, no Link.
export function BlogCardPreview({ post }: { post: BlogCardPost }) {
  return (
    <div className={`${cardBaseClass} max-w-sm`} style={cardStyle}>
      <BlogCardFace post={post} />
    </div>
  );
}
