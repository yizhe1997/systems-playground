import Link from "next/link";

/** "Showing 201 to 400 of 5,023" with Newer and Older links. Plain links in the address, so it works without scripts. */
export function Pager({ page, pageSize, total, params }: { page: number; pageSize: number; total: number; params: Record<string, string> }) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const href = (p: number) => {
    const q = new URLSearchParams();
    if (params.account) q.set("account", params.account);
    q.set("from", params.from);
    q.set("to", params.to);
    if (params.deleted) q.set("deleted", "1");
    if (p > 1) q.set("page", String(p));
    return `/trades?${q.toString()}`;
  };
  const pages = Math.ceil(total / pageSize);
  return (
    <nav className="pager" aria-label="Pages of trades">
      <span>Showing {first.toLocaleString("en-US")} to {last.toLocaleString("en-US")} of {total.toLocaleString("en-US")}</span>
      <span className="spacer" />
      {page > 1 ? <Link className="btn" href={href(page - 1)}>Newer</Link> : <span className="btn" aria-disabled="true">Newer</span>}
      <span className="helper">Page {page} of {pages}</span>
      {page < pages ? <Link className="btn" href={href(page + 1)}>Older</Link> : <span className="btn" aria-disabled="true">Older</span>}
    </nav>
  );
}
