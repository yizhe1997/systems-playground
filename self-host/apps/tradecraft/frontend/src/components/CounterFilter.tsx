"use client";

import { useRouter } from "next/navigation";
import type { Account } from "@/lib/types";

/** The account filter of the mistake counter: all accounts (the default) or one. */
export function CounterFilter({ accounts, current, period, date }: { accounts: Account[]; current: string; period: string; date: string }) {
  const router = useRouter();
  return (
    <div className="field switcher">
      <label className="label" htmlFor="counter-account">Accounts</label>
      <select
        id="counter-account"
        className="field-input"
        value={current}
        onChange={(e) => {
          const q = new URLSearchParams({ period });
          if (date) q.set("date", date);
          if (e.target.value) q.set("account", e.target.value);
          router.push(`/mistakes?${q.toString()}`);
        }}
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.archived ? " (archived)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
