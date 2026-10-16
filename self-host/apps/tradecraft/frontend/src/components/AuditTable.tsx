import type { AuditEntry } from "@/lib/types";
import { dateTime } from "@/lib/format";
import { cookies } from "next/headers";
import { ReorderTable } from "@/components/ReorderTable";
import { readColumnOrder } from "@/lib/columnOrder";

// What an agent read, in words: the entry holds the tool's name and the account's name, never a figure (screen B8).
const READS: Record<string, string> = {
  list_accounts: "Accounts", list_trades: "Trades", get_day: "Day", get_week: "Week", get_month: "Month",
  list_mistakes: "Mistakes", mistake_counter: "Mistake counter", get_focus: "Focus", get_settings: "Settings",
};
const about = (e: AuditEntry) => {
  if (e.kind !== "agent_read") return e.subject || "—";
  const [tool, ...rest] = e.subject.split(", ");
  return [READS[tool] ?? tool, ...rest].join(", ");
};
/** An agent's entry names the token and says it was an agent; a refusal with no known token is "Not signed in". */
const who = (e: AuditEntry) => (e.actorKind === "agent" && e.actorLabel ? `${e.actorLabel} [agent]` : (e.identityEmail ?? "Not signed in"));

/** The log, newest first. The moment is shown in the journal time zone; nothing here can be edited or removed. */
export async function AuditTable({ entries, zone }: { entries: AuditEntry[]; zone: string }) {
  return (
    <div className="card card-flush">
      <ReorderTable
        id="audit"
        initialOrder={readColumnOrder(await cookies(), "audit")}
        rowKeys={entries.map((e) => e.id)}
        columns={[
          { key: "when", label: "When", cells: entries.map((e) => dateTime(e.at, zone, true)) },
          { key: "who", label: "Who", cells: entries.map(who) },
          { key: "what", label: "What", cells: entries.map((e) => e.kindLabel) },
          { key: "about", label: "About", cells: entries.map(about) },
          { key: "changed", label: "Changed", cells: entries.map((e) => (e.changedFields.length > 0 ? e.changedFields.join(", ") : "—")) },
        ]}
      />
    </div>
  );
}
