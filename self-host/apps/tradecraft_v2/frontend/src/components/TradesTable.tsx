import Link from "next/link";
import type { Trade } from "@/lib/types";
import { dateTime, dayLabel, money, plain, profitClass, rValue } from "@/lib/format";
import { DeleteButton, RestoreButton } from "@/components/TradeRowActions";

function ResultCell({ t }: { t: Trade }) {
  if (t.netResult === null) return <>—</>;
  return (
    <>
      <span className={profitClass(t.netResult)}>{money(t.netResult, t.currency, true)}</span>
      {t.typedResult !== null && <span className="reason">typed in</span>}
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
                  <td className="num tall"><RCell t={t} /></td>
                  <td className="actions">
                    {deletedView ? (
                      <RestoreButton id={t.id} label={label} />
                    ) : (
                      <>
                        <Link className="btn-quiet" href={`/trades/${t.id}/edit`} aria-label={`Edit ${label}`}>Edit</Link>
                        <DeleteButton id={t.id} label={label} />
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="helper table-foot">Each result is in its own account&apos;s currency. This list has no totals.</p>
    </div>
  );
}
