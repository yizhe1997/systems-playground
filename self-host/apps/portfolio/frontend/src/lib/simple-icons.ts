import * as simpleIcons from 'simple-icons';

type IconMatch = { path: string; hex: string; title: string };

let slugIndex: Map<string, IconMatch> | null = null;

function buildIndex(): Map<string, IconMatch> {
  const index = new Map<string, IconMatch>();
  for (const icon of Object.values(simpleIcons)) {
    const i = icon as { slug?: string; path?: string; hex?: string; title?: string };
    if (i && i.slug && i.path) {
      index.set(i.slug, { path: i.path, hex: i.hex ?? '000000', title: i.title ?? i.slug });
    }
  }
  return index;
}

// Admin types a free-text slug (e.g. "typescript", "postgresql"); a typo or
// an icon simple-icons doesn't have must degrade to no-icon, never a build
// error or a broken image - lookupIcon returning null is the expected,
// handled case, not an edge case.
export function lookupIcon(slug: string | undefined | null): IconMatch | null {
  if (!slug) return null;
  if (!slugIndex) slugIndex = buildIndex();
  return slugIndex.get(slug.trim().toLowerCase()) ?? null;
}
