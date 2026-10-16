"use client";

import { useState } from "react";
import { call } from "@/lib/browserApi";

/** Downloads everything (all accounts, all trades including deleted ones) as tradecraft-export-YYYY-MM-DD.json. */
export function ExportButton() {
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {failure && <span className="helper" role="alert">! {failure}</span>}
      <button
        type="button"
        className="btn-quiet"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailure(null);
          const r = await call<{ exportedAt: string }>("GET", "/export");
          setBusy(false);
          if (!r.ok) return setFailure(r.unreachable ? "Could not reach the journal. Nothing was exported." : r.error.message);
          const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `tradecraft-export-${r.data.exportedAt.slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        }}
      >
        Export
      </button>
    </>
  );
}
