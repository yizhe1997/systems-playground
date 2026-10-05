const LABELS: Record<string, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  missing: "Missing",
  today: "Today",
  not_reviewed: "Not reviewed",
  no_trades: "No trades",
  not_yet: "Not yet",
};

/** A status in words (never colour alone). Missing is dashed, as drawn. */
export function StatusChip({ state }: { state: string | null | undefined }) {
  if (!state) return null;
  return <span className={`chip${state === "missing" ? " chip-dashed" : ""}${state === "reviewed" ? " chip-solid" : ""}`}>{LABELS[state] ?? state}</span>;
}
