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

export function DeleteButton({ id, label }: { id: string; label: string }) {
  const { busy, failure, remove } = useTradeActions();
  return (
    <>
      <button type="button" className="btn-quiet" disabled={busy} onClick={() => remove(id)} aria-label={`Delete ${label}`}>
        Delete
      </button>
      {failure && <span className="reason" role="alert">! {failure}</span>}
    </>
  );
}

export function RestoreButton({ id, label }: { id: string; label: string }) {
  const { busy, failure, restore } = useTradeActions();
  return (
    <>
      <button type="button" className="btn" disabled={busy} onClick={() => restore(id)} aria-label={`Restore ${label}`}>
        Restore
      </button>
      {failure && <span className="reason" role="alert">! {failure}</span>}
    </>
  );
}
