"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@/lib/types";
import { DateRangeFilter } from "@/components/DateRangeFilter";

type Values = { account: string; from: string; to: string; deleted: boolean };

export function TradeFilters(props: Values & { accounts: Account[]; monthFrom: string; monthTo: string }) {
  const { accounts } = props;
  const router = useRouter();
  // What is shown is kept here, not only in the address: a navigation takes a moment, and two quick edits in a
  // row (From, then To) must not undo each other. When the address changes (Clear filters), take it over.
  const addr = `${props.account}|${props.from}|${props.to}|${props.deleted}`;
  const [seen, setSeen] = useState(addr);
  const [v, setV] = useState<Values>({ account: props.account, from: props.from, to: props.to, deleted: props.deleted });
  if (seen !== addr) {
    setSeen(addr);
    setV({ account: props.account, from: props.from, to: props.to, deleted: props.deleted });
  }
  const { account, from, to, deleted } = v;
  const go = (next: Partial<Values>) => {
    const n = { ...v, ...next };
    setV(n);
    const q = new URLSearchParams();
    if (n.account) q.set("account", n.account);
    // an empty date is kept in the address so the page does not fall back to the current month
    q.set("from", n.from);
    q.set("to", n.to);
    if (n.deleted) q.set("deleted", "1");
    router.replace(`/trades?${q.toString()}`);
  };
  return (
    <div className="filters" role="search" aria-label="Filter trades">
      <div className="field" style={{ minWidth: 230 }}>
        <label className="label" htmlFor="f-account">Account</label>
        <select id="f-account" className="field-input" value={account} onChange={(e) => go({ account: e.target.value })}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.archived ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </div>
      <DateRangeFilter from={from} to={to} monthFrom={props.monthFrom} monthTo={props.monthTo} onApply={(f, t) => go({ from: f, to: t })} />
      <Link className="btn-quiet" href={`/trades?from=&to=${deleted ? "&deleted=1" : ""}`}>
        Clear filters
      </Link>
      <span className="grow" />
      <label className="switch">
        <input type="checkbox" checked={deleted} onChange={(e) => go({ deleted: e.target.checked })} />
        <span className="track" aria-hidden="true" />
        <span>Show deleted</span>
      </label>
    </div>
  );
}
