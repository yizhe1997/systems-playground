'use client';
import { useState } from 'react';
import { Server } from 'lucide-react';
import SimpleIcon from '@/components/SimpleIcon';
import { lookupIcon } from '@/lib/simple-icons';

const isImageUrl = (v: string) => /^https?:\/\//i.test(v);

// The Icon field accepts either a simple-icons slug ("react", "docker") or
// a direct image URL, distinguished by an http(s):// prefix - the two
// namespaces can't collide, so no separate "type" field is needed. A slug
// simple-icons doesn't have, or a URL that fails to load, both degrade to
// the generic Server icon rather than a broken image or a build error.
export default function ProjectIcon({ slug, className = 'w-6 h-6 text-black' }: { slug?: string; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  // Reset the failed-image flag when slug changes, during render rather than
  // in an effect - React's documented pattern for "adjust state when a prop
  // changes" (react.dev/learn/you-might-not-need-an-effect). Avoids the
  // extra post-mount render an effect would cost, and React bails out of
  // re-rendering if the state doesn't actually change.
  const [prevSlug, setPrevSlug] = useState(slug);
  if (slug !== prevSlug) {
    setPrevSlug(slug);
    setImageFailed(false);
  }

  if (slug && isImageUrl(slug) && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={slug} alt="" className={`${className} object-contain`} onError={() => setImageFailed(true)} />
    );
  }

  return lookupIcon(slug) ? (
    <SimpleIcon slug={slug} className={className} />
  ) : (
    <Server className={className} aria-hidden="true" />
  );
}
