"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker, type DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import "react-day-picker/style.css";
import { dayLabel } from "@/lib/format";

// plain "YYYY-MM-DD" days to and from the local Date the calendar wants (never through UTC, so a day never shifts)
const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toText = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shown = (s: string) => dayLabel(s).split(" ").slice(1).join(" "); // 2 Oct 2025

/**
 * The from-to date filter of the Trades list: a button that opens a two-month calendar in a popover, picking a start
 * and an end day. It is the range date picker of shadcn/ui (a popover holding a react-day-picker calendar in range
 * mode), built from the same parts and styled with this app's own tokens. A range applies when both ends are chosen.
 */
export function DateRangeFilter({ from, to, monthFrom, monthTo, onApply }: { from: string; to: string; monthFrom: string; monthTo: string; onApply: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  const applied: DateRange | undefined = from || to ? { from: from ? toDate(from) : undefined, to: to ? toDate(to) : undefined } : undefined;
  // the first click of a new range waits here; the second click completes it (either order), applies it and closes
  const [pending, setPending] = useState<Date | null>(null);

  const label = from && to ? `${shown(from)} – ${shown(to)}` : from ? `From ${shown(from)}` : to ? `Up to ${shown(to)}` : "All dates";
  const apply = (f: string, t: string) => {
    onApply(f, t);
    setOpen(false);
  };

  return (
    <div className="field">
      <label className="label" htmlFor="f-range">Date range</label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setPending(null); // a half-picked range is dropped when the popover is closed or opened again
        }}
      >
        <Popover.Trigger id="f-range" className="field-input range-trigger">
          <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{label}</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="start" className="popup-positioner">
            <Popover.Popup className="popup range-popup" aria-label="Choose a date range">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                weekStartsOn={1}
                captionLayout="dropdown"
                startMonth={new Date(2015, 0)}
                endMonth={new Date(2035, 11)}
                defaultMonth={from ? toDate(from) : new Date()}
                selected={pending ? { from: pending } : applied}
                onDayClick={(day) => {
                  if (!pending) return setPending(day);
                  const [first, last] = pending <= day ? [pending, day] : [day, pending];
                  setPending(null);
                  apply(toText(first), toText(last));
                }}
              />
              <div className="range-actions">
                <button type="button" className="btn-quiet" onClick={() => apply(monthFrom, monthTo)}>This month</button>
                <button type="button" className="btn-quiet" onClick={() => apply("", "")}>All dates</button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
