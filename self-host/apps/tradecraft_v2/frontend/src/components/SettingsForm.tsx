"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { call } from "@/lib/browserApi";
import { nowIn, zoneName } from "@/lib/format";
import { FailureBanner, Waiting, useNoticeableWait } from "@/components/Notice";

export function SettingsForm({ timeZone, zones }: { timeZone: string; zones: string[] }) {
  const router = useRouter();
  const [zone, setZone] = useState(timeZone);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const waiting = useNoticeableWait(saving);
  const known = zones.includes(zone);
  // the clock is read in the browser, so server and browser never disagree about the minute
  const [clock, setClock] = useState("");
  useEffect(() => {
    if (!known) return setClock("");
    setClock(nowIn(zone));
    const t = setInterval(() => setClock(nowIn(zone)), 15_000);
    return () => clearInterval(t);
  }, [zone, known]);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setSaved(false);
    const r = await call("PUT", "/settings", { timeZone: zone });
    setSaving(false);
    if (r.ok) {
      setError(null);
      setSaved(true);
      router.refresh();
      return;
    }
    if (r.unreachable) return setFailure("Could not reach the journal. Nothing was saved. What you typed is still here.");
    if (r.status === 422) return setError(r.error.fields?.[0]?.message ?? r.error.message);
    setFailure(r.error.message);
  };

  return (
    <>
      {failure && <FailureBanner message={failure} retry={save} />}
      <form
        className="card"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {/* the card is as wide as every other card; its content keeps a readable line length */}
        <div className="stack-md" style={{ maxWidth: 640 }}>
        <div className="field">
          <label className="label" htmlFor="s-zone">Time zone (type to search any standard time zone)</label>
          <input id="s-zone" className="field-input" list="zones" value={zone} autoComplete="off" spellCheck={false}
            onChange={(e) => { setZone(e.target.value); setSaved(false); setError(null); }}
            aria-invalid={error ? true : undefined} aria-describedby={error ? "s-zone-err" : undefined} />
          <datalist id="zones">
            {zones.map((z) => <option key={z} value={z} />)}
          </datalist>
          {error && <p className="field-error" id="s-zone-err">! {error}</p>}
          <p className="helper">Times you enter and see, and the trading day, are read in this zone. Changing it never moves a trade in time.</p>
        </div>
        {known && (
          <div>
            <div><strong>{zoneName(zone)}</strong> ({zone})</div>
            <p className="helper">Current time in this zone: {clock}</p>
          </div>
        )}
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="submit" className="btn" disabled={saving}>Save</button>
          {waiting && <Waiting label="Saving…" />}
          {saved && <span role="status">Saved. Trading days were recomputed.</span>}
        </div>
        </div>
      </form>
    </>
  );
}
