"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal on the native <dialog> element: focus stays inside, Escape closes it, and the page behind is inert.
 * The parent owns `open`; closing by Escape or the backdrop calls onClose.
 */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId(); // a viewer can open over another dialog, so each needs its own id
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {open && (
        <>
          <h2 id={titleId}>{title}</h2>
          <div className="stack">{children}</div>
        </>
      )}
    </dialog>
  );
}
