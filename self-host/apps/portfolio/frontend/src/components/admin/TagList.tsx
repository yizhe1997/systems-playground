'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SortableList, { SortableRow, DragHandle } from '@/components/admin/SortableList';

// Replaces the comma-joined-string-as-input pattern (value={arr.join(', ')},
// onChange re-splits it) - that round-trips the array to a string and back
// on every keystroke, so typing a comma to start the next tag gets silently
// eaten by the immediately-following split/filter/rejoin. Chips + a draft
// input sidesteps that entirely: the array is never serialized back into
// the thing you're typing in.
//
// Tags are keyed by "value-index" (not the value alone) for drag identity -
// duplicate tag text is already prevented on add, but reusing bare values as
// dnd-kit ids would still break the moment two chips briefly share a value
// mid-edit elsewhere in the tree.
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
        <SortableList items={values} getId={(_, i) => `tag-${i}`} onReorder={onChange} disabled={disabled} layout="grid">
          <div className="flex flex-wrap gap-1.5">
            {values.map((v, i) => (
              <SortableRow key={`tag-${i}`} id={`tag-${i}`} disabled={disabled}>
                {({ attributes, listeners }) => (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold pl-1 pr-2 py-1 border-2 border-black bg-white"
                    style={{ borderRadius: '0.375rem' }}
                  >
                    <DragHandle
                      attributes={attributes}
                      listeners={listeners}
                      disabled={disabled}
                      label={`Reorder ${v}`}
                      className="cursor-grab active:cursor-grabbing touch-none text-[var(--ds-charcoal)]/30 hover:text-[var(--ds-charcoal)] disabled:opacity-20 disabled:cursor-not-allowed"
                    />
                    {v}
                    {!disabled && (
                      <button type="button" onClick={() => remove(i)} aria-label={`Remove ${v}`} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )}
              </SortableRow>
            ))}
          </div>
        </SortableList>
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
