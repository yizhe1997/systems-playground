"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditKind, Identity } from "@/lib/types";
import { DateRangeFilter } from "@/components/DateRangeFilter";

type Values = { identity: string; kind: string; from: string; to: string };

/** The filters of the Audit log: who, what and when. They live in the address, like the Trades list's. */
export function AuditFilters(props: Values & { identities: Identity[]; kinds: AuditKind[]; monthFrom: string; monthTo: string }) {
  const router = useRouter();
  const addr = `${props.identity}|${props.kind}|${props.from}|${props.to}`;
  const [seen, setSeen] = useState(addr);
  const [v, setV] = useState<Values>({ identity: props.identity, kind: props.kind, from: props.from, to: props.to });
  if (seen !== addr) {
    setSeen(addr);
    setV({ identity: props.identity, kind: props.kind, from: props.from, to: props.to });
  }
  const go = (next: Partial<Values>) => {
    const n = { ...v, ...next };
    setV(n);
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(n)) if (val) q.set(k, val);
    const s = q.toString();
    router.replace(s ? `/audit?${s}` : "/audit");
  };
  return (
    <div className="filters" role="search" aria-label="Filter the audit log">
      <div className="field" style={{ minWidth: 230 }}>
        <label className="label" htmlFor="a-identity">Identity</label>
        <select id="a-identity" className="field-input" value={v.identity} onChange={(e) => go({ identity: e.target.value })}>
          <option value="">All identities</option>
          {props.identities.map((i) => (
            <option key={i.id} value={i.id}>
              {i.email}
              {i.active ? "" : " (disabled)"}
            </option>
          ))}
          <option value="none">Not signed in</option>
        </select>
      </div>
      <div className="field" style={{ minWidth: 200 }}>
        <label className="label" htmlFor="a-kind">What</label>
        <select id="a-kind" className="field-input" value={v.kind} onChange={(e) => go({ kind: e.target.value })}>
          <option value="">All kinds</option>
          {props.kinds.map((k) => (
            <option key={k.kind} value={k.kind}>{k.label}</option>
          ))}
        </select>
      </div>
      <DateRangeFilter from={v.from} to={v.to} monthFrom={props.monthFrom} monthTo={props.monthTo} onApply={(f, t) => go({ from: f, to: t })} />
      <Link className="btn-quiet" href="/audit">Clear filters</Link>
    </div>
  );
}
