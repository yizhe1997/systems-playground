// The order of a list's columns, chosen by the owner by dragging the headings. It is kept in a cookie per list
// (`tc-cols-<list>` = column keys, comma-separated), so the server renders the order the owner left it in and nothing jumps.
export const COLUMN_COOKIE = "tc-cols-";

/** The saved order, with columns that no longer exist dropped and new columns added at their default place. */
export function mergeOrder(saved: string[], defaults: string[]): string[] {
  const known = saved.filter((k, i) => defaults.includes(k) && saved.indexOf(k) === i);
  return [...known, ...defaults.filter((k) => !known.includes(k))];
}

/** The saved order of list `id` from the request's cookies (`await cookies()`); empty when none was saved. */
export function readColumnOrder(store: { get(name: string): { value: string } | undefined }, id: string): string[] {
  const v = store.get(COLUMN_COOKIE + id)?.value ?? "";
  return v ? v.split(",") : [];
}
