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

// The slug isn't discoverable from simpleicons.org's own UI (it copies full
// SVG markup, not the identifier this field needs) - search by the brand's
// display name instead ("jquery" finds jQuery) so nobody has to guess the
// exact string. Prefix matches (name/slug starting with the query) rank
// above substring matches.
export function searchIcons(query: string, limit = 8): { slug: string; title: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (!slugIndex) slugIndex = buildIndex();

  const startsWith: { slug: string; title: string }[] = [];
  const contains: { slug: string; title: string }[] = [];
  for (const [slug, icon] of slugIndex) {
    const title = icon.title.toLowerCase();
    if (startsWith.length >= limit) break;
    if (slug.startsWith(q) || title.startsWith(q)) startsWith.push({ slug, title: icon.title });
    else if (contains.length < limit && (slug.includes(q) || title.includes(q))) contains.push({ slug, title: icon.title });
  }
  return [...startsWith, ...contains].slice(0, limit);
}
