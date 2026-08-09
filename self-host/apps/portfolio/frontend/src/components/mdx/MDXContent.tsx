'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import YouTubeEmbed from '@/components/mdx/YouTubeEmbed';

// Components content is allowed to invoke - deliberately a fixed, curated
// set (not arbitrary HTML/imports) so admin-authored posts can embed rich
// things like video without the content itself being able to run anything
// we didn't explicitly wire up.
const mdxComponents = { YouTubeEmbed };

// Post content (source string, stored in Redis) is compiled to a React
// component in the browser on demand - there's no build step, so this has
// to happen at render time, not ahead of time like file-based MDX setups.
const DEFAULT_PROSE_CLASS = 'prose prose-sm prose-headings:font-extrabold prose-a:text-black prose-a:underline max-w-none';

export default function MDXContent({ source, proseClassName = DEFAULT_PROSE_CLASS }: { source: string; proseClassName?: string }) {
  const [Content, setContent] = useState<ComponentType<{ components?: typeof mdxComponents }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear the previous render's result during render, not as the first
  // synchronous act inside the effect - React's documented pattern for
  // "reset state when a prop changes" (react.dev/learn/you-might-not-need-an-effect).
  // The effect below still owns the actual async work (compiling MDX is a
  // legitimate side effect), it just no longer calls setState synchronously
  // at its own top level - only from the resolved/rejected promise callbacks.
  const [prevSource, setPrevSource] = useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setContent(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    evaluate(source, {
      ...runtime,
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeHighlight],
    })
      .then((mod) => {
        if (!cancelled) setContent(() => mod.default as ComponentType<{ components?: typeof mdxComponents }>);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render content');
      });
    return () => { cancelled = true; };
  }, [source]);

  if (error) {
    return (
      <div className="text-[var(--ds-charcoal)] p-4 bg-[var(--ds-yellow)] border-2 border-black" style={{ borderRadius: '0.5rem' }}>
        <p className="font-bold text-sm">Couldn&apos;t render this content</p>
        <p className="text-xs mt-1 font-mono whitespace-pre-wrap">{error}</p>
      </div>
    );
  }

  if (!Content) return <p className="text-sm text-[var(--ds-charcoal)]/70">Rendering&hellip;</p>;

  return (
    <div className={proseClassName}>
      <Content components={mdxComponents} />
    </div>
  );
}
