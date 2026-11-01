"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import "react-day-picker/style.css";
import { screenTime } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const two = Array.from({ length: 60 }, (_, i) => pad(i));

/** The date and time out of what the field holds: "2025-10-01 09:41" or "Wed 1 Oct 2025 09:41" (weekday optional). */
function parse(text: string): { day: Date; hh: string; mm: string } | null {
  const t = text.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(t);
  if (iso) return { day: new Date(+iso[1], +iso[2] - 1, +iso[3]), hh: iso[4], mm: iso[5] };
  const long = /^(?:[A-Za-z]{3} )?(\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2})/.exec(t);
  const mon = long ? MONTHS.findIndex((m) => m.toLowerCase() === long[2].toLowerCase()) : -1;
  return long && mon >= 0 ? { day: new Date(+long[3], mon, +long[1]), hh: long[4], mm: long[5] } : null;
}

/**
 * A time that is typed ("2025-10-01 09:41" or "Wed 1 Oct 2025 09:41") or picked: the calendar button opens a month
 * calendar and a 24-hour hour and minute, built from the same parts as the Trades date-range filter. The field keeps
 * holding text, so the save and the live preview read it exactly as before.
 */
export function DateTimeField({ id, value, onChange, ...aria }: { id: string; value: string; onChange: (v: string) => void; "aria-invalid"?: boolean; "aria-describedby"?: string }) {
  const [open, setOpen] = useState(false);
  const cur = parse(value);
  const hh = cur?.hh ?? "00";
  const mm = cur?.mm ?? "00";
  const put = (day: Date, h: string, m: string) => onChange(screenTime(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())} ${h}:${m}`));

  return (
    <div className="datetime">
      <input id={id} className="field-input" placeholder="Date and time" value={value} autoComplete="off"
        onChange={(e) => onChange(e.target.value)} onBlur={() => onChange(screenTime(value))} {...aria} />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="datetime-open" aria-label="Pick date and time">
          <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="end" className="popup-positioner">
            <Popover.Popup className="popup range-popup" aria-label="Pick date and time">
              <DayPicker
                mode="single"
                weekStartsOn={1}
                captionLayout="dropdown"
                startMonth={new Date(2015, 0)}
                endMonth={new Date(2035, 11)}
                defaultMonth={cur?.day ?? new Date()}
                selected={cur?.day}
                onSelect={(day) => day && put(day, hh, mm)}
              />
              <div className="range-actions datetime-time">
                <span className="helper">Time (24-hour)</span>
                <span>
                  <select aria-label="Hour" className="field-input" value={hh} disabled={!cur} onChange={(e) => cur && put(cur.day, e.target.value, mm)}>
                    {two.slice(0, 24).map((h) => <option key={h}>{h}</option>)}
                  </select>
                  {" : "}
                  <select aria-label="Minute" className="field-input" value={mm} disabled={!cur} onChange={(e) => cur && put(cur.day, hh, e.target.value)}>
                    {two.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </span>
                <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>Done</button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
