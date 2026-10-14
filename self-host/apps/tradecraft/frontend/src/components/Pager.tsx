import Link from "next/link";
import { PageSizeSelect } from "@/components/PageSizeSelect";

/**
 * "Showing 11 to 20 of 5,023", Rows per page, and Newer and Older links. The links are plain links in the address (with
 * the size in them), so paging works without scripts.
 * `path` is the page, `params` the query to keep (an empty value is kept as an empty value when `keepEmpty` names it,
 * as the Trades list does for its dates), and `label` names the pages for assistive technology.
 */
export function Pager({
  page, pageSize, total, params, path = "/trades", keepEmpty = ["from", "to"], label = "Pages of trades",
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string>;
  path?: string;
  keepEmpty?: string[];
  label?: string;
}) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v || keepEmpty.includes(k)) q.set(k, v ?? "");
    }
    q.set("size", String(pageSize));
    if (p > 1) q.set("page", String(p));
    return `${path}?${q.toString()}`;
  };
  const pages = Math.ceil(total / pageSize);
  return (
    <nav className="pager" aria-label={label}>
      <span>Showing {first.toLocaleString("en-US")} to {last.toLocaleString("en-US")} of {total.toLocaleString("en-US")}</span>
      <span className="spacer" />
      <PageSizeSelect value={pageSize} path={path} params={params} />
      {page > 1 ? <Link className="btn" href={href(page - 1)}>Newer</Link> : <span className="btn" aria-disabled="true">Newer</span>}
      <span className="helper">Page {page} of {pages}</span>
      {page < pages ? <Link className="btn" href={href(page + 1)}>Older</Link> : <span className="btn" aria-disabled="true">Older</span>}
    </nav>
  );
}
