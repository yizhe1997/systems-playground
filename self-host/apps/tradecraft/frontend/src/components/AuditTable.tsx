import type { AuditEntry } from "@/lib/types";
import { dateTime } from "@/lib/format";

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
                <td className="datetime">{dateTime(e.at, zone, true)}</td>
                <td>{e.identityEmail ?? "Not signed in"}</td>
                <td>{e.kindLabel}</td>
                <td>{e.subject || "—"}</td>
                <td>{e.changedFields.length > 0 ? e.changedFields.join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
