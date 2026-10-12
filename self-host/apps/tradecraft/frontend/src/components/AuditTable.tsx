import type { AuditEntry } from "@/lib/types";
import { dateTime } from "@/lib/format";

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
export function AuditTable({ entries, zone }: { entries: AuditEntry[]; zone: string }) {
  return (
    <div className="card card-flush">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">What</th>
              <th scope="col">About</th>
              <th scope="col">Changed</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{dateTime(e.at, zone, true)}</td>
                <td>{who(e)}</td>
                <td>{e.kindLabel}</td>
                <td>{about(e)}</td>
                <td>{e.changedFields.length > 0 ? e.changedFields.join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
