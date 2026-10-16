"use client";

import { useRouter } from "next/navigation";
import type { Account } from "@/lib/types";
import { mondayOfIsoWeek } from "@/lib/format";
import { AccountOptions } from "@/components/AccountOptions";

/**
 * The account chooser and the period picker of the mistake counter, side by side. The picker is the browser's own week
 * or month field (type="week" or "month"), the same family as the date field of Reviews, so there is no library; it
 * shows the viewed week or month and choosing another moves the counter there.
 */
export function CounterControls({ accounts, account, period, value }: { accounts: Account[]; account: string; period: "week" | "month"; value: string }) {
  const router = useRouter();
  const go = (acct: string, date?: string) => {
    const q = new URLSearchParams({ period });
    if (date) q.set("date", date);
    if (acct) q.set("account", acct);
    router.push(`/mistakes?${q.toString()}`);
  };
  return (
    <div className="bar-group bar-fields">
      <div className="field switcher">
        <label className="label" htmlFor="counter-account">Account</label>
        <select
          id="counter-account"
          className="field-input"
          value={account}
          onChange={(e) => go(e.target.value, new URLSearchParams(window.location.search).get("date") ?? undefined)}
        >
          <option value="">All live accounts</option>
          <AccountOptions accounts={accounts} />
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="counter-period">{period === "week" ? "Week" : "Month"}</label>
        <input
          id="counter-period"
          key={`${period}-${value}`}
          type={period}
          className="field-input"
          style={{ width: 190 }}
          defaultValue={value}
          onChange={(e) => e.target.value && go(account, period === "week" ? mondayOfIsoWeek(e.target.value) : `${e.target.value}-01`)}
        />
      </div>
    </div>
  );
}
