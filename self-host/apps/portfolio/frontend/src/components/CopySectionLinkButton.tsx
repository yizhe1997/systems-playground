'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { copyText } from '@/lib/copy-text';
import { playBlip } from '@/lib/blip-sound';

// Sits inside a heading that has `group/heading` on it - invisible until
// that heading is hovered/focused-within, then copies a deep link to this
// section (e.g. "https://.../#projects") to the clipboard. Uses
// `text-current` throughout instead of a fixed color so it reads correctly
// whether the heading it's attached to is black-on-white (Featured Projects)
// or white-on-charcoal (Blog). `sectionId` is optional - a page like
// /projects that IS the whole page (not a section within a longer one) has
// no anchor to point at, so omitting it just copies the current page URL.
export default function CopySectionLinkButton({ sectionId, label }: { sectionId?: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = sectionId ? `${window.location.origin}${window.location.pathname}#${sectionId}` : window.location.href;
    if (await copyText(url)) {
      playBlip();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={sectionId ? `Copy link to ${label} section` : `Copy link to ${label}`}
      data-cursor-label="Copy"
      className="inline-flex items-center justify-center w-8 h-8 shrink-0 self-center text-current opacity-0 group-hover/heading:opacity-100 focus-visible:opacity-100 hover:opacity-60 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-md"
    >
      {copied ? <Check className="w-5 h-5" aria-hidden="true" /> : <Link2 className="w-5 h-5" aria-hidden="true" />}
    </button>
  );
}
