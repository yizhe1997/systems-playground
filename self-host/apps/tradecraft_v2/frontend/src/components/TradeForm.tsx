"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, FieldError, Preview, Trade, TradeFormValues } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { dateTime, dayLabel, monthQuery, plain, splitLocal } from "@/lib/format";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
import { FailureBanner, Waiting, useNoticeableWait } from "@/components/Notice";
import { ResultPreview } from "@/components/ResultPreview";
import { useTradeActions } from "@/components/TradeRowActions";

const blankValues = (accounts: Account[]): TradeFormValues => ({
  accountId: accounts.length === 1 ? accounts[0].id : "",
  instrument: "",
  direction: "",
  size: "",
  entryPrice: "",
  entryDate: "",
  entryTime: "",
  exitPrice: "",
  exitDate: "",
  exitTime: "",
  dollarsPerPoint: "",
  cost: "",
  stopPrice: "",
  typedResult: "",
  thesis: "",
});

function fromTrade(t: Trade): TradeFormValues {
  const entry = splitLocal(t.entryAt);
  const exit = splitLocal(t.exitAt);
  return {
    accountId: t.accountId,
    instrument: t.instrument,
    direction: t.direction,
    size: t.size,
    entryPrice: t.entryPrice,
    entryDate: entry.date,
    entryTime: entry.time,
    exitPrice: t.exitPrice,
    exitDate: exit.date,
    exitTime: exit.time,
    dollarsPerPoint: t.dollarsPerPoint ?? "",
    cost: t.cost,
    stopPrice: t.stopPrice ?? "",
    typedResult: t.typedResult ?? "",
    thesis: t.thesis ?? "",
  };
}

const instant = (date: string, time: string) => (date && time ? `${date}T${time}` : date || time || "");
const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

export function TradeForm({ accounts, zone, zoneLabel, trade }: { accounts: Account[]; zone: string; zoneLabel: string; trade?: Trade }) {
  const router = useRouter();
  const initial = useMemo(() => (trade ? fromTrade(trade) : blankValues(accounts)), [trade, accounts]);
  const [v, setV] = useState<TradeFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const del = useTradeActions();

  const dirty = !saved && JSON.stringify(v) !== JSON.stringify(initial);
  const { prompt, leave } = useUnsavedGuard(dirty);
  const waiting = useNoticeableWait(saving);

  const set = <K extends keyof TradeFormValues>(k: K, value: TradeFormValues[K]) => {
    setV((p) => ({ ...p, [k]: value }));
    // typing in a field clears its own message (the date and time of one instant share one message)
    const key = k === "entryDate" || k === "entryTime" ? "entryAt" : k === "exitDate" || k === "exitTime" ? "exitAt" : k;
    setErrors((p) => {
      if (!(key in p)) return p;
      const rest = { ...p };
      delete rest[key];
      return rest;
    });
  };

  const account = accounts.find((a) => a.id === v.accountId) ?? null;
  const dppBlank = v.dollarsPerPoint.trim() === "";

  // the live preview: whatever is typed so far, worked out by the same SQL rules as the saved trade
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const r = await call<Preview>("POST", "/trades/preview", {
        accountId: orNull(v.accountId),
        instrument: orNull(v.instrument),
        direction: v.direction || null,
        size: orNull(v.size),
        entryPrice: orNull(v.entryPrice),
        entryAt: orNull(instant(v.entryDate, v.entryTime)),
        exitPrice: orNull(v.exitPrice),
        exitAt: orNull(instant(v.exitDate, v.exitTime)),
        dollarsPerPoint: orNull(v.dollarsPerPoint),
        cost: orNull(v.cost),
        stopPrice: orNull(v.stopPrice),
        typedResult: orNull(v.typedResult),
      });
      if (mine === seq.current && r.ok) setPreview(r.data);
    }, 250);
    return () => clearTimeout(t);
  }, [v]);

  const submit = async () => {
    setSaving(true);
    setFailure(null);
    setConflict(null);
    const body = {
      accountId: v.accountId,
      instrument: v.instrument,
      direction: v.direction,
      size: v.size,
      entryPrice: v.entryPrice,
      entryAt: instant(v.entryDate, v.entryTime),
      exitPrice: v.exitPrice,
      exitAt: instant(v.exitDate, v.exitTime),
      dollarsPerPoint: orNull(v.dollarsPerPoint),
      cost: orNull(v.cost),
      stopPrice: orNull(v.stopPrice),
      typedResult: dppBlank ? orNull(v.typedResult) : null,
      thesis: orNull(v.thesis),
      ...(trade ? { expectedUpdatedAt: trade.updatedAt } : {}),
    };
    const r = trade ? await call<Trade>("PUT", `/trades/${trade.id}`, body) : await call<Trade>("POST", "/trades", body);
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      router.push(monthQuery(r.data.tradingDay));
      router.refresh();
      return;
    }
    if (r.unreachable) {
      setSummary(null);
      return setFailure("Could not reach the journal. Nothing was saved. What you typed is still here.");
    }
    if (r.status === 409) return setConflict(r.error.message);
    if (r.status === 422) {
      const next: Record<string, string> = {};
      for (const f of (r.error.fields ?? []) as FieldError[]) next[f.field] = f.message;
      setErrors(next);
      setSummary(r.error.message);
      return;
    }
    setFailure(r.error.message);
  };

  // each error is shown beside its field, marked with "!" (never colour alone)
  const err = (field: string, id: string) =>
    errors[field] ? (
      <p className="field-error" id={`${id}-err`}>! {errors[field]}</p>
    ) : null;
  const inv = (field: string, id: string) => ({ "aria-invalid": errors[field] ? true : undefined, "aria-describedby": errors[field] ? `${id}-err` : undefined }) as const;

  const heading = trade ? "Edit trade" : "Log a trade";

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">{heading}</h1>
          {trade && (
            <p className="subtitle">
              {trade.instrument} {trade.direction === "long" ? "Long" : "Short"} x{plain(trade.size)} · {dayLabel(trade.tradingDay)} · {trade.accountName}
            </p>
          )}
        </div>
        <a className="back" href="/trades" onClick={(e) => { e.preventDefault(); leave("/trades"); }}>&lt; Trades</a>
      </div>

      {summary && Object.keys(errors).length > 0 && (
        <div className="banner" role="alert">
          <div>
            <div className="banner-title">{summary}</div>
            <div className="helper">Fix the fields marked with a !.</div>
          </div>
        </div>
      )}
      {failure && <FailureBanner message={failure} retry={submit} />}
      {conflict && <FailureBanner message={conflict} retry={() => router.refresh()} retryLabel="Reload" />}
      {del.failure && <FailureBanner message={del.failure} />}

      <form
        className="form-cols"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="card">
          <h2 className="section">Basic</h2>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label className="label" htmlFor="t-account">Account</label>
              <select id="t-account" className="field-input" value={v.accountId} onChange={(e) => set("accountId", e.target.value)} {...inv("accountId", "t-account")}>
                <option value="">Choose an account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.archived ? " (archived)" : ""}
                  </option>
                ))}
              </select>
              {err("accountId", "t-account")}
            </div>

            <div className="field">
              <label className="label" htmlFor="t-instrument">Instrument</label>
              <input id="t-instrument" className="field-input" placeholder="e.g. NQ" value={v.instrument} onChange={(e) => set("instrument", e.target.value)} autoComplete="off" {...inv("instrument", "t-instrument")} />
              {err("instrument", "t-instrument")}
            </div>

            <div className="field">
              <span className="label" id="t-direction-label">Direction</span>
              <div className="segment" role="radiogroup" aria-labelledby="t-direction-label" aria-invalid={errors.direction ? true : undefined}>
                {(["long", "short"] as const).map((d) => (
                  <label key={d}>
                    <input type="radio" name="direction" value={d} checked={v.direction === d} onChange={() => set("direction", d)} />
                    <span>{d === "long" ? "Long" : "Short"}</span>
                  </label>
                ))}
              </div>
              {err("direction", "t-direction")}
            </div>

            <div className="field">
              <label className="label" htmlFor="t-size">Size</label>
              <input id="t-size" className="field-input" inputMode="decimal" placeholder="1" value={v.size} onChange={(e) => set("size", e.target.value)} autoComplete="off" {...inv("size", "t-size")} />
              {err("size", "t-size")}
            </div>

            <div className="field">
              <label className="label" htmlFor="t-entry-price">Entry price</label>
              <input id="t-entry-price" className="field-input" inputMode="decimal" placeholder="0.00" value={v.entryPrice} onChange={(e) => set("entryPrice", e.target.value)} autoComplete="off" {...inv("entryPrice", "t-entry-price")} />
              {err("entryPrice", "t-entry-price")}
            </div>

            <div className="field">
              <span className="label" id="t-entry-label">Entry time ({zoneLabel})</span>
              <div className="datetime" role="group" aria-labelledby="t-entry-label">
                <input type="date" aria-label="Entry date" className="field-input" value={v.entryDate} onChange={(e) => set("entryDate", e.target.value)} {...inv("entryAt", "t-entry")} />
                <input aria-label="Entry time of day, 24-hour HH:MM" className="field-input" placeholder="HH:MM" inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" value={v.entryTime} onChange={(e) => set("entryTime", e.target.value)} {...inv("entryAt", "t-entry")} />
              </div>
              {err("entryAt", "t-entry")}
            </div>

            <div className="field">
              <label className="label" htmlFor="t-exit-price">Exit price</label>
              <input id="t-exit-price" className="field-input" inputMode="decimal" placeholder="0.00" value={v.exitPrice} onChange={(e) => set("exitPrice", e.target.value)} autoComplete="off" {...inv("exitPrice", "t-exit-price")} />
              {err("exitPrice", "t-exit-price")}
            </div>

            <div className="field">
              <span className="label" id="t-exit-label">Exit time ({zoneLabel})</span>
              <div className="datetime" role="group" aria-labelledby="t-exit-label">
                <input type="date" aria-label="Exit date" className="field-input" value={v.exitDate} onChange={(e) => set("exitDate", e.target.value)} {...inv("exitAt", "t-exit")} />
                <input aria-label="Exit time of day, 24-hour HH:MM" className="field-input" placeholder="HH:MM" inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" value={v.exitTime} onChange={(e) => set("exitTime", e.target.value)} {...inv("exitAt", "t-exit")} />
              </div>
              {err("exitAt", "t-exit")}
              <p className="helper">Times are typed to the minute and shown on a 24-hour clock.</p>
            </div>

            <div className="field">
              <label className="label" htmlFor="t-dpp">Dollars per point (optional)</label>
              <input id="t-dpp" className="field-input" inputMode="decimal" placeholder="e.g. 20" value={v.dollarsPerPoint} onChange={(e) => set("dollarsPerPoint", e.target.value)} autoComplete="off" {...inv("dollarsPerPoint", "t-dpp")} />
              {dppBlank && <p className="helper">Leave blank to type the result</p>}
              {err("dollarsPerPoint", "t-dpp")}
            </div>

            <div className="field">
              <label className="label" htmlFor="t-cost">Costs (total)</label>
              <input id="t-cost" className="field-input" inputMode="decimal" placeholder="0.00" value={v.cost} onChange={(e) => set("cost", e.target.value)} autoComplete="off" {...inv("cost", "t-cost")} />
              {err("cost", "t-cost")}
            </div>

            <div className="field">
              <label className="label" htmlFor="t-stop">Stop price (optional)</label>
              <input id="t-stop" className="field-input" inputMode="decimal" placeholder="e.g. 21440.00" value={v.stopPrice} onChange={(e) => set("stopPrice", e.target.value)} autoComplete="off" {...inv("stopPrice", "t-stop")} />
              {err("stopPrice", "t-stop")}
            </div>

            {dppBlank && (
              <div className="field">
                <label className="label" htmlFor="t-typed">Result after costs (required)</label>
                <input id="t-typed" className="field-input" inputMode="decimal" placeholder="0.00" value={v.typedResult} onChange={(e) => set("typedResult", e.target.value)} autoComplete="off" {...inv("typedResult", "t-typed")} />
                <p className="helper">Needed while dollars per point is blank.</p>
                {err("typedResult", "t-typed")}
              </div>
            )}
          </div>

          <details className="details" open={v.thesis !== "" || undefined}>
            <summary>Details</summary>
            <div className="field" style={{ marginTop: 8 }}>
              <label className="label" htmlFor="t-thesis">Why I took it (thesis, optional)</label>
              <textarea id="t-thesis" className="field-input" value={v.thesis} onChange={(e) => set("thesis", e.target.value)} {...inv("thesis", "t-thesis")} />
              {err("thesis", "t-thesis")}
            </div>
          </details>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={saving}>{trade ? "Save changes" : "Save trade"}</button>
            <button type="button" className="btn-quiet" onClick={() => leave("/trades")}>Cancel</button>
            {waiting && <Waiting label="Saving…" />}
            <span className="spacer" />
            {trade && (
              <>
                <span className="helper">Last saved {dateTime(trade.updatedAt, zone)}</span>
                <button type="button" className="btn-quiet" disabled={del.busy} onClick={() => del.remove(trade.id, () => { setSaved(true); router.push("/trades"); router.refresh(); })}>
                  Delete trade
                </button>
              </>
            )}
          </div>
        </div>

        <ResultPreview
          preview={preview}
          values={v}
          currency={account?.currency ?? null}
          accountName={account?.name ?? null}
          accountStart={account?.tradingDayStart ?? null}
          zoneLabel={zoneLabel}
          dppBlank={dppBlank}
        />
      </form>
      {prompt}
    </>
  );
}
