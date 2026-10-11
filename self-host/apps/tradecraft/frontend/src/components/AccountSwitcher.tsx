"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Account } from "@/lib/types";
import { AccountOptions } from "@/components/AccountOptions";

/** The account of a review screen, kept in the address so it follows the owner from Reviews to a day to a week. */
export function AccountSwitcher({ accounts, current }: { accounts: Account[]; current: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <div className="field switcher">
      <label className="label" htmlFor="account-switcher">Account</label>
      <select
        id="account-switcher"
        className="field-input"
        value={current}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString());
          q.set("account", e.target.value);
          router.push(`${path}?${q.toString()}`);
        }}
      >
        <AccountOptions accounts={accounts} />
      </select>
    </div>
  );
}
