'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Why an AI triage step at all?',
    a: "Every resume request used to get the exact same manual review, regardless of how obviously legitimate or spammy it was. Claude Haiku 4.5 now reads each request first and flags a legitimacy verdict plus a short read on role fit - cheap and fast enough to run on every submission. It doesn't decide anything on its own: the verdict is advisory context for the actual human decision, not a gate. If the model call fails for any reason, the request still goes to manual review - nothing gets silently dropped.",
  },
  {
    q: 'Why is human review taking so long?',
    a: "Human review doesn't run on a queue or an SLA - I read these myself when I have time, so it can take anywhere from minutes to a couple of weeks depending on what else is going on. There's a backstop, though: if a request sits for 30 days with no decision, it automatically expires - its contact details get anonymized and it can no longer be approved, so nothing is left hanging indefinitely. If yours expires and you're still interested, just submit a new request.",
  },
];

function FaqCard({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border-2 border-black" style={{ borderRadius: '0.75rem', boxShadow: 'var(--ds-shadow-sm)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
        style={{ borderRadius: '0.75rem' }}
      >
        <span className="font-extrabold text-sm sm:text-base" style={{ fontFamily: 'var(--ds-font-display)' }}>
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        />
      </button>
      <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <p className="text-sm text-[var(--ds-charcoal)]/70 px-4 sm:px-5 pb-4 sm:pb-5 max-w-2xl">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function ResumeStatusFaq() {
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item) => (
        <FaqCard key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  );
}
