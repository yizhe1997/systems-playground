"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/browserApi";
import { useToast } from "@/components/Notice";

/** Soft delete with a 10-second Undo (FR-023); Show deleted keeps the trade restorable afterwards. */
export function useTradeActions() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const restore = async (id: string) => {
    setBusy(true);
    const r = await call("POST", `/trades/${id}/restore`);
    setBusy(false);
    if (!r.ok) return setFailure(r.unreachable ? "Could not reach the journal. Nothing was changed." : r.error.message);
    setFailure(null);
    router.refresh();
  };
  const remove = async (id: string, then?: () => void) => {
    setBusy(true);
    const r = await call("DELETE", `/trades/${id}`);
    setBusy(false);
    if (!r.ok) return setFailure(r.unreachable ? "Could not reach the journal. Nothing was changed." : r.error.message);
    setFailure(null);
    toast({ text: "Trade deleted.", actionLabel: "Undo", onAction: () => restore(id) });
    if (then) then();
    else router.refresh();
  };
  return { busy, failure, remove, restore };
}

/**
 * One handler for every Delete and Restore button of the table. The buttons are plain server-rendered HTML
 * (data-delete / data-restore), so a list of thousands of trades hydrates one component, not thousands.
 */
export function RowActions({ children }: { children: React.ReactNode }) {
  const { busy, failure, remove, restore } = useTradeActions();
  return (
    <div
      onClick={(e) => {
        if (busy) return;
        const el = (e.target as Element).closest<HTMLElement>("[data-delete],[data-restore]");
        if (!el) return;
        if (el.dataset.delete) void remove(el.dataset.delete);
        else if (el.dataset.restore) void restore(el.dataset.restore);
      }}
    >
      {failure && (
        <div className="banner" role="alert">
          <span className="banner-title">! {failure}</span>
        </div>
      )}
      {children}
    </div>
  );
}
