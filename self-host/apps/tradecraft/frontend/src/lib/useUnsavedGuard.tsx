"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/Dialog";

/**
 * While `dirty`, leaving the page asks "Leave without saving? Your changes will be lost." Covers closing the tab and
 * every in-app link (the sidebar, "< Trades", Cancel). The browser's own Back button cannot be intercepted here.
 * Render the returned `prompt` once in the component.
 */
export function useUnsavedGuard(dirty: boolean): { prompt: ReactNode; leave: (href: string) => void } {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin || a.hasAttribute("download")) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(a.pathname + a.search);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const leave = useCallback((href: string) => {
    if (dirtyRef.current) setPending(href);
    else router.push(href);
  }, [router]);

  const prompt = (
    <Dialog open={pending !== null} onClose={() => setPending(null)} title="Leave without saving?">
      <p>Your changes will be lost.</p>
      <div className="form-actions">
        <button type="button" className="btn" onClick={() => setPending(null)} autoFocus>
          Keep editing
        </button>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => {
            const href = pending;
            dirtyRef.current = false;
            setPending(null);
            if (href) router.push(href);
          }}
        >
          Leave
        </button>
      </div>
    </Dialog>
  );
  return { prompt, leave };
}
