"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@/lib/types";
import { PERIOD_NAMES, periodLabel, viewHref, type Period, type View } from "@/lib/analytics";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { AccountOptions } from "@/components/AccountOptions";

const ORDER: Period[] = ["week", "month", "last30", "year", "all", "custom"];

/**
 * Screen H4: the period and the accounts every figure of Home and Analytics is made for (and, on Analytics, the
 * break-even band). A choice is a link: it goes into the address and nothing is stored.
 */
export function PeriodScope({ view, accounts, base, withBand = false }: { view: View; accounts: Account[]; base: string; withBand?: boolean }) {
  const router = useRouter();
  const [band, setBand] = useState(view.band);
  const [seen, setSeen] = useState(view.band);
  if (seen !== view.band) {
    setSeen(view.band);
    setBand(view.band);
  }
  const go = (over: Partial<Pick<View, "period" | "from" | "to" | "account" | "band">>) => router.replace(viewHref(base, view, over));
  const sorted = [...accounts].sort((a, b) => Number(a.archived) - Number(b.archived));
  const nowIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="filters" role="search" aria-label="Choose what the figures cover">
      <div className="field" style={{ minWidth: 290 }}>
        <label className="label" htmlFor="v-period">Period</label>
        <select
          id="v-period"
          className="field-input"
          value={view.period}
          aria-invalid={view.error ? true : undefined}
          aria-describedby={view.error ? "v-period-error" : undefined}
          onChange={(e) => go({ period: e.target.value as Period, from: view.from, to: view.to })}
        >
          {ORDER.map((p) => (
            <option key={p} value={p}>{p === view.period ? periodLabel(p, view.from, view.to) : p === "custom" ? "Custom range..." : PERIOD_NAMES[p]}</option>
          ))}
        </select>
      </div>
      {view.period === "custom" && (
        <DateRangeFilter from={view.from} to={view.to} monthFrom={view.from || nowIso} monthTo={view.to || nowIso} onApply={(f, t) => go({ period: "custom", from: f, to: t })} />
      )}
      <div className="field" style={{ minWidth: 250 }}>
        <label className="label" htmlFor="v-account">Accounts</label>
        <select id="v-account" className="field-input" value={view.account} onChange={(e) => go({ account: e.target.value })}>
          <option value="">All live accounts</option>
          <AccountOptions accounts={sorted} />
        </select>
      </div>
      {withBand && (
        <div className="field" style={{ width: 170 }}>
          <label className="label" htmlFor="v-band">Break-even band</label>
          <input
            id="v-band"
            className="field-input"
            inputMode="decimal"
            placeholder="None"
            value={band}
            onChange={(e) => setBand(e.target.value)}
            onBlur={() => band.trim() !== view.band && go({ band: band.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      )}
      <p className="helper filters-note">
        {withBand
          ? "A trade inside the band is neither a win nor a loss."
          : view.account
            ? "One account, shown on its own."
            : "Backtest accounts are left out."}
      </p>
      {view.error && <p className="field-error filters-error" id="v-period-error">! {view.error} The figures below keep the default period until a valid range is applied.</p>}
    </div>
  );
}
