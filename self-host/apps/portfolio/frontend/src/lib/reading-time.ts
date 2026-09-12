// Rough estimate only - strips the markdown syntax most likely to distort a naive word count
// (fenced/inline code, image markup, link URLs) before splitting on whitespace, so a code sample
// or a long link href doesn't inflate the count the way a plain split would.
const WORDS_PER_MINUTE = 200;

export function estimateReadingMinutes(markdown: string): number {
  if (!markdown) return 0;
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links - keep the visible text, drop the URL
    .replace(/[#>*_~-]/g, ' '); // heading/emphasis/list markers

  const words = stripped.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE));
}
