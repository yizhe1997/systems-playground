"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A panel from the right edge on the native <dialog>: focus stays inside, Escape closes it. Closing with unsaved
 * changes asks "Leave without saving?" here, because the page-wide guard only sees link clicks.
 */
export function Drawer({ open, onClose, title, dirty, children }: { open: boolean; onClose: () => void; title: ReactNode; dirty: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) setAsking(false);
  }, [open]);
  const requestClose = () => (dirty ? setAsking(true) : onClose());
  return (
    <dialog ref={ref} className="drawer" aria-labelledby="drawer-title" onCancel={(e) => { e.preventDefault(); requestClose(); }}>
      {open && (
        <div className="drawer-body">
          <div className="drawer-head">
            <h2 className="section" id="drawer-title">{title}</h2>
            <button type="button" className="btn-quiet" onClick={requestClose}>Close</button>
          </div>
          {asking && (
            <div className="banner" role="alertdialog" aria-label="Leave without saving?">
              <div>
                <div className="banner-title">Leave without saving?</div>
                <div className="helper">Your changes will be lost.</div>
              </div>
              <span className="spacer" />
              <button type="button" className="btn" onClick={() => setAsking(false)} autoFocus>Keep editing</button>
              <button type="button" className="btn-quiet" onClick={() => { setAsking(false); onClose(); }}>Leave</button>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
