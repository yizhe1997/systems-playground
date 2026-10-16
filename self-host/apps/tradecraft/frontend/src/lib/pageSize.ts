// How many rows a list shows at once. Ten by default (a screen of rows you can read), and 25, 50 or 100 on request; the
// last choice is remembered in a cookie so a click in the sidebar does not put it back.
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];
export const PAGE_SIZE_COOKIE = "tc-page-size";

/** The size asked for in the address (`size`), else the remembered one, else the default. Anything else is the default. */
export function pickPageSize(param: string | undefined, remembered: string | undefined): number {
  for (const v of [param, remembered]) {
    const n = Number.parseInt(v ?? "", 10);
    if ((PAGE_SIZES as readonly number[]).includes(n)) return n;
  }
  return DEFAULT_PAGE_SIZE;
}
