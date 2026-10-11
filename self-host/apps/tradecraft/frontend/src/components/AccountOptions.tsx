import type { Account } from "@/lib/types";

/**
 * The options of an account chooser: live accounts first, then the backtest accounts in their own group, each marked
 * "(Backtest)" so the kind is visible wherever an account is chosen (feature 003, FR-006).
 */
export function AccountOptions({ accounts }: { accounts: Account[] }) {
  const text = (a: Account) => `${a.name}${a.kind === "backtest" ? " (Backtest)" : ""}${a.archived ? " (archived)" : ""}`;
  const live = accounts.filter((a) => a.kind !== "backtest");
  const backtests = accounts.filter((a) => a.kind === "backtest");
  return (
    <>
      {live.map((a) => <option key={a.id} value={a.id}>{text(a)}</option>)}
      {backtests.length > 0 && (
        <optgroup label="Backtests">
          {backtests.map((a) => <option key={a.id} value={a.id}>{text(a)}</option>)}
        </optgroup>
      )}
    </>
  );
}
