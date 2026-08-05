'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Replaces the comma-joined-string-as-input pattern (value={arr.join(', ')},
// onChange re-splits it) - that round-trips the array to a string and back
// on every keystroke, so typing a comma to start the next tag gets silently
// eaten by the immediately-following split/filter/rejoin. Chips + a draft
// input sidesteps that entirely: the array is never serialized back into
// the thing you're typing in.
export default function TagList({
  id,
  values,
  onChange,
  disabled,
  placeholder = 'Type a tag, press Enter',
  className,
}: {
  id?: string;
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const v = draft.trim();
    setDraft('');
    if (v && !values.includes(v)) onChange([...values, v]);
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 border-2 border-black"
              style={{ borderRadius: '0.375rem' }}
            >
              {v}
              {!disabled && (
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${v}`} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
            remove(values.length - 1);
          }
        }}
        onBlur={commit}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
    </div>
  );
}
