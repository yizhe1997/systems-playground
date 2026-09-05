'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, Eye } from 'lucide-react';
import { formatPostmarkStamp } from '@/lib/format-date';
import LoadingSpinner from '@/components/LoadingSpinner';

export type BlogCardPost = {
  id: string;
  title: string;
  cover_image_url: string;
  published_date: string;
  // No scale to either of these - a love is a one-time "a reader liked
  // this" tally (not a 1-5 average), a view is a plain visit count.
  love_count: number;
  view_count: number;
  // Omitted (undefined/0) for posts whose body lives at an external URL rather than inline -
  // computing it there would mean fetching every external post just to render the list, which
  // isn't worth it for a "min read" label.
  reading_minutes?: number;
};

// Shared visual body for the card - a cover (image or sage/icon fallback), a
// postmark-style date stamp overlapping the top-right corner, and a title
// plus a love/view/read-time meta row. Rendered by both the real BlogCard
// (wrapped in a navigating Link) and BlogCardPreview (wrapped in a plain div
// for the admin panel, which must never navigate away from the editor).
function BlogCardFace({ post }: { post: BlogCardPost }) {
  const stamp = formatPostmarkStamp(post.published_date);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Covers the cached-image case - if the browser already had this image, `complete` is true
  // before this effect runs and no `onLoad` event will fire to flip imageLoaded on its own.
  useEffect(() => {
    if (imgRef.current?.complete) setImageLoaded(true);
  }, []);

  return (
    <>
      <div
        className="relative aspect-video w-full overflow-hidden border-b-2 border-black flex items-center justify-center"
        style={{ borderRadius: '0 0.65rem 0 0', backgroundColor: post.cover_image_url ? 'var(--ds-charcoal)' : 'var(--ds-sage)' }}
      >
        {post.cover_image_url ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner label="Loading" size={44} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={post.cover_image_url}
              alt=""
              onLoad={() => setImageLoaded(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          </>
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

      {/* A real (not min-) height, sized for the worst case (a full 2-line title): line-clamp-2
          caps the title there regardless of actual length, so this never needs to grow past it.
          Real and empty cards (see EmptyBlogCard) share this exact value - a minHeight let a
          2-line real title render taller than a 1-line one, and taller still than the empty
          placeholder's fixed short text, so a row's height changed depending on which cards
          happened to land in it - most visibly right when /api/posts resolves and empty
          placeholders get swapped for real cards. No flex-1 here (unlike the old minHeight
          version) - flex-1's flex-basis:0% would win over the explicit height below, since a flex
          item's main-axis size in a column comes from flex-basis/grow, not the height property.
          justify-between still pins the meta row to the bottom regardless of whether the title
          took 1 or 2 lines. */}
      <div className="p-5 flex flex-col justify-between gap-1.5" style={{ height: BLOG_CARD_CONTENT_HEIGHT }}>
        <h3 className="text-lg font-extrabold leading-snug line-clamp-2">{post.title || 'Untitled post'}</h3>
        <div className="flex items-center justify-between text-xs font-medium text-[var(--ds-charcoal)]/50">
          <span>{!!post.reading_minutes && `${post.reading_minutes} min read`}</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              {post.view_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" aria-hidden="true" fill={post.love_count > 0 ? 'currentColor' : 'none'} />
              {post.love_count}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// Shared by BlogCardFace's content block and EmptyBlogCard's own, so a row of real posts and a
// row of empty placeholders always compute to the exact same card height (see the comment at the
// content div below for why a minHeight wasn't enough).
export const BLOG_CARD_CONTENT_HEIGHT = 110;

// flex flex-col + h-full: CSS Grid's default align-items:stretch already makes every card in a
// row match the tallest sibling's outer height, but without these the card's own children have
// no way to know about (or grow into) that extra height - h-full pulls the stretched grid height
// down onto this element explicitly, and flex flex-col lets the p-5 block below claim it via flex-1.
const cardBaseClass =
  'group relative flex flex-col h-full border-2 border-black bg-white shadow-[8px_8px_0px_0px_var(--ds-yellow)]';
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
