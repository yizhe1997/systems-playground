import type { Trade } from "@/lib/types";
import { dateTime, dayLabel, money, plain, profitClass, rValue } from "@/lib/format";
import { RowActions } from "@/components/TradeRowActions";

function ResultCell({ t }: { t: Trade }) {
  if (t.netResult === null) return <>—</>;
  return (
    <>
      <span className={profitClass(t.netResult)}>{money(t.netResult, t.currency, true)}</span>
      {t.typedResult !== null && <span className="reason">typed in</span>}
    </>
  );
}

const PLAN: Record<string, string> = { yes: "Followed", partly: "Partly", no: "Not followed" };

/** The plan answer from the daily review beside the result, so the result never stands alone (principle I). */
function PlanCell({ t }: { t: Trade }) {
  return (
    <>
      {t.planFollowed ? PLAN[t.planFollowed] : "Not judged yet"}
      {t.label && <span className="reason">{t.label === "mistake" ? "Mistake" : "Valid loss"}</span>}
    </>
  );
}

function RCell({ t }: { t: Trade }) {
  if (t.rMultiple !== null) return <>{rValue(t.rMultiple)}</>;
  const reason = t.dollarsPerPoint === null ? "no dollars per point" : (t.reasons.rMultiple ?? "");
  return (
    <>
      —<span className="reason">{reason}</span>
    </>
  );
}

export function TradesTable({ trades, zone, deletedView }: { trades: Trade[]; zone: string; deletedView: boolean }) {
  return (
    <RowActions>
    <div className="card card-flush">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Exit time</th>
              <th scope="col">Trading day</th>
              <th scope="col">Account</th>
              <th scope="col">Instrument</th>
              <th scope="col">Direction</th>
              <th scope="col">Size</th>
              <th scope="col">Net result</th>
              <th scope="col">Plan</th>
              <th scope="col">R</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const label = `${t.instrument} ${t.direction} trade of ${dateTime(t.exitAt, zone)}`;
              return (
                <tr key={t.id} className={deletedView ? "muted-row" : undefined}>
                  <td>{dateTime(t.exitAt, zone)}</td>
                  <td>{dayLabel(t.tradingDay, false)}</td>
                  <td>{t.accountName}</td>
                  <td className="instrument">
                    {t.instrument}
                    {deletedView && <span className="tag tag-dashed">Deleted</span>}
                  </td>
                  <td>{t.direction === "long" ? "Long" : "Short"}</td>
                  <td className="num">{plain(t.size)}</td>
                  <td className="num tall"><ResultCell t={t} /></td>
                  <td className="tall"><PlanCell t={t} /></td>
                  <td className="num tall"><RCell t={t} /></td>
                  <td className="actions">
                    {deletedView ? (
                      <button type="button" className="btn" data-restore={t.id} aria-label={`Restore ${label}`}>Restore</button>
                    ) : (
                      <>
                        {/* a plain link: thousands of prefetching Link components would slow the list down */}
                        <a className="btn-quiet" href={`/trades/${t.id}/edit`} aria-label={`Edit ${label}`}>Edit</a>
                        <button type="button" className="btn-quiet" data-delete={t.id} aria-label={`Delete ${label}`}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="helper table-foot">Each result is in its own account&apos;s currency. This list has no totals. The plan answer comes from the daily review.</p>
    </div>
    </RowActions>
  );
}
