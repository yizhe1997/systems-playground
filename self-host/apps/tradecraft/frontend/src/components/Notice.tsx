"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Toast = { text: string; actionLabel?: string; onAction?: () => void | Promise<void> };
const ToastContext = createContext<(t: Toast, ms?: number) => void>(() => {});

/** An Undo-style notice that lasts 10 seconds (FR-023). It lives above the pages, so it survives a navigation. */
export function useToast() {
  return useContext(ToastContext);
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: Toast, ms = 10_000) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status">
        {toast && (
          <div className="toast">
            <span>{toast.text}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="btn-quiet"
                onClick={async () => {
                  setToast(null);
                  await toast.onAction?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** The failure banner: "! Could not reach the journal." with a retry. Nothing typed is lost. */
export function FailureBanner({ message, retry, retryLabel = "Try again" }: { message: string; retry?: () => void; retryLabel?: string }) {
  return (
    <div className="banner" role="alert">
      <span className="banner-title">! {message}</span>
      <span className="spacer" />
      {retry && (
        <button type="button" className="btn" onClick={retry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/** Used on server-rendered pages when the journal could not be read. */
export function CouldNotLoad() {
  const router = useRouter();
  return <FailureBanner message="Could not reach the journal." retry={() => router.refresh()} />;
}

/** True once a wait has lasted 300 ms, so quick actions show no flicker. */
export function useNoticeableWait(pending: boolean, after = 300): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!pending) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), after);
    return () => clearTimeout(t);
  }, [pending, after]);
  return show;
}

export function Waiting({ label = "Working…" }: { label?: string }) {
  return (
    <span className="helper" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}
