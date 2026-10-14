"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { COLUMN_COOKIE, mergeOrder } from "@/lib/columnOrder";

/** One column: its cells, one per row, already rendered by the page. `key` is stable and is what is saved. */
export type TableColumn = { key: string; label: string; className?: string; cells: ReactNode[] };

/**
 * A list whose columns the owner can put in the order they like: drag a heading onto another, or focus a heading and press
 * Alt with the left or right arrow. The order is kept per list in a cookie. The actions column (`end`) stays last.
 * The page renders the cells (so a list of server-rendered rows stays server-rendered); this only places them.
 */
export function ReorderTable({
  id, columns, end, rowKeys, rowClasses, initialOrder = [], tableClass = "table",
}: {
  id: string;
  columns: TableColumn[];
  end?: { label: string; className?: string; cells: ReactNode[] };
  rowKeys: string[];
  rowClasses?: (string | undefined)[];
  initialOrder?: string[];
  tableClass?: string;
}) {
  const uid = useId();
  const defaults = columns.map((c) => c.key);
  const [saved, setSaved] = useState(initialOrder);
  const order = mergeOrder(saved, defaults);
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const refocus = useRef<string | null>(null);

  // after a keyboard move React puts the heading in a new place; give it its focus back
  useEffect(() => {
    if (!refocus.current) return;
    document.getElementById(`${uid}-${refocus.current}`)?.focus();
    refocus.current = null;
  }, [order.join(","), uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const keep = (next: string[]) => {
    setSaved(next);
    document.cookie = `${COLUMN_COOKIE}${id}=${next.join(",")}; path=/; max-age=31536000; samesite=lax`;
  };
  const move = (key: string, to: number) => {
    const from = order.indexOf(key);
    if (from < 0 || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, key);
    keep(next);
    return next;
  };
  const reset = () => {
    setSaved([]);
    document.cookie = `${COLUMN_COOKIE}${id}=; path=/; max-age=0; samesite=lax`;
    setSaid("Columns are back in their original order.");
  };
  const customized = order.join(",") !== defaults.join(",");
  const hint = `${uid}-hint`;

  return (
    <>
      <p className="sr-only" id={hint}>Drag a column heading to move the column, or focus it and press Alt with the left or right arrow.</p>
      <p className="sr-only" role="status">{said}</p>
      <div className="table-wrap">
        <table className={tableClass}>
          <thead>
            <tr>
              {order.map((key) => {
                const c = byKey.get(key)!;
                return (
                  <th
                    key={key}
                    scope="col"
                    draggable
                    title="Drag to move this column"
                    className={dragging === key ? "col-dragging" : over === key ? "col-over" : undefined}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", key);
                      setDragging(key);
                    }}
                    onDragOver={(e) => {
                      if (!dragging || dragging === key) return;
                      e.preventDefault();
                      setOver(key);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragging) move(dragging, order.indexOf(key));
                      setDragging(null);
                      setOver(null);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  >
                    {/* only the keyboard uses this button; the mouse drags the heading itself */}
                    <button
                      type="button"
                      className="col-head"
                      id={`${uid}-${key}`}
                      aria-describedby={hint}
                      onKeyDown={(e) => {
                        if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
                        e.preventDefault();
                        const at = order.indexOf(key) + (e.key === "ArrowLeft" ? -1 : 1);
                        if (move(key, at)) {
                          refocus.current = key;
                          setSaid(`${c.label} is now column ${at + 1} of ${order.length}.`);
                        }
                      }}
                    >
                      {c.label}
                    </button>
                  </th>
                );
              })}
              {end && <th scope="col"><span className="sr-only">{end.label}</span></th>}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk, i) => (
              <tr key={rk} className={rowClasses?.[i]}>
                {order.map((key) => {
                  const c = byKey.get(key)!;
                  return <td key={key} className={c.className}>{c.cells[i]}</td>;
                })}
                {end && <td className={end.className}>{end.cells[i]}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customized && (
        <div className="table-foot col-tools">
          <button type="button" className="btn-quiet" onClick={reset}>Reset column order</button>
        </div>
      )}
    </>
  );
}
