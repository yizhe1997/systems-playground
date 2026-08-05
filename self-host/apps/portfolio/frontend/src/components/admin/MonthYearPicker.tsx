'use client';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const selectClass =
  'border-2 border-black rounded-[0.375rem] px-2 py-1.5 text-sm bg-white text-[var(--ds-charcoal)] focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed';

export default function MonthYearPicker({
  label,
  value,
  onChange,
  disabled,
  allowOngoing,
  ongoingLabel = 'Currently here',
}: {
  label: string;
  value: string; // "YYYY-MM", or "" for empty/ongoing
  onChange: (v: string) => void;
  disabled?: boolean;
  allowOngoing?: boolean;
  ongoingLabel?: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => String(currentYear - i));
  // "Ongoing" (selects hidden, blank value) only exists as a state when this
  // field allows it - a required field like Start with no allowOngoing must
  // never render into a state with no way back to a real value.
  const isOngoing = Boolean(allowOngoing) && !value;
  const [y, m] = value ? value.split('-') : [String(currentYear), '01'];

  // A required field (allowOngoing false) renders these selects showing a
  // default month/year even when value is still "" - but nothing had ever
  // written that default back to the parent, so the real stored value
  // stayed blank unless the admin happened to touch a dropdown. Anything
  // reading the real value (formatDateRange, validation) then silently
  // treated it as unset. Sync it on mount so "looks filled in" and "is
  // filled in" can't diverge.
  useEffect(() => {
    if (!allowOngoing && !value) onChange(`${currentYear}-01`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMonth = (newM: string) => onChange(`${y}-${newM}`);
  const setYear = (newY: string) => onChange(`${newY}-${m}`);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-[var(--ds-charcoal)]/70">{label}</Label>
        {allowOngoing && (
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isOngoing}
              onChange={(e) => onChange(e.target.checked ? '' : `${currentYear}-01`)}
              disabled={disabled}
              className="accent-black"
            />
            {ongoingLabel}
          </label>
        )}
      </div>
      {!isOngoing && (
        <div className="flex gap-2">
          <select value={m} onChange={(e) => setMonth(e.target.value)} disabled={disabled} className={selectClass}>
            {MONTHS.map((name, i) => (
              <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
            ))}
          </select>
          <select value={y} onChange={(e) => setYear(e.target.value)} disabled={disabled} className={selectClass}>
            {years.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
