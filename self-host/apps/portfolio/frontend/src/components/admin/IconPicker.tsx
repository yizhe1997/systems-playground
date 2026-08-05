'use client';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import SimpleIcon from '@/components/SimpleIcon';
import { searchIcons } from '@/lib/simple-icons';

const isImageUrl = (v: string) => /^https?:\/\//i.test(v);

// Free-typing a slug means guessing an exact string simpleicons.org never
// actually shows you (it copies full SVG markup, not the identifier). This
// searches by brand name instead - type "jquery", pick "jQuery" from the
// list, done. A pasted http(s):// URL skips search entirely - typing a URL
// isn't "searching", it's using the field's other supported input.
export default function IconPicker({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Search a brand name, or paste an image URL...',
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const results = useMemo(() => (value && !isImageUrl(value) ? searchIcons(value, 8) : []), [value]);

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full bg-white border-2 border-black max-h-56 overflow-y-auto"
          style={{ borderRadius: '0.375rem', boxShadow: '4px 4px 0px 0px #000' }}
        >
          {results.map((r) => (
            <button
              key={r.slug}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(r.slug); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-black hover:text-white transition-colors"
            >
              <SimpleIcon slug={r.slug} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{r.title}</span>
              <span className="opacity-50 font-mono ml-auto shrink-0">{r.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
