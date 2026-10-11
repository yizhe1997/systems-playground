import type { Account } from "./types";

/**
 * The account a review screen shows: the one asked for, else the first active live account by name (a backtest is never
 * the default), else the first active account, else the first of all.
 */
export function resolveAccount(accounts: Account[], requested?: string): Account | null {
  return (
    accounts.find((a) => a.id === requested) ??
    accounts.find((a) => !a.archived && a.kind !== "backtest") ??
    accounts.find((a) => !a.archived) ??
    accounts[0] ??
    null
  );
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
