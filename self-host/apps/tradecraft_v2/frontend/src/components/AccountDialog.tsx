"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, FieldError } from "@/lib/types";
import { call } from "@/lib/browserApi";
import { Dialog } from "@/components/Dialog";
import { FailureBanner, Waiting, useNoticeableWait, useToast } from "@/components/Notice";

type Props = {
  open: boolean;
  account: Account | null; // null: a new account
  currencies: string[];
  onClose: () => void;
};

export function AccountDialog({ open, account, currencies, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={account ? "Edit account" : "New account"}>
      {/* remounted on every open, so the fields always start from the account as it is now */}
      <AccountForm key={account?.id ?? "new"} account={account} currencies={currencies} onClose={onClose} />
    </Dialog>
  );
}

function AccountForm({ account, currencies, onClose }: Omit<Props, "open">) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [currency, setCurrency] = useState(account?.currency ?? "USD");
  const [start, setStart] = useState(account?.tradingDayStart ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const waiting = useNoticeableWait(saving);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setConflict(null);
    const body = {
      name,
      currency,
      tradingDayStart: start.trim() === "" ? null : start.trim(),
      ...(account ? { expectedUpdatedAt: account.updatedAt } : {}),
    };
    const r = account ? await call<Account>("PUT", `/accounts/${account.id}`, body) : await call<Account>("POST", "/accounts", body);
    setSaving(false);
    if (r.ok) {
      onClose();
      router.refresh();
      return;
    }
    if (r.unreachable) return setFailure("Could not reach the journal. Nothing was saved. What you typed is still here.");
    if (r.status === 409) return setConflict(r.error.message);
    if (r.status === 422) {
      const next: Record<string, string> = {};
      for (const f of (r.error.fields ?? []) as FieldError[]) next[f.field] = f.message;
      return setErrors(next);
    }
    setFailure(r.error.message);
  };

  const archive = async () => {
    if (!account) return;
    setSaving(true);
    const r = await call("POST", `/accounts/${account.id}/archive`);
    setSaving(false);
    if (!r.ok) return setFailure(r.unreachable ? "Could not reach the journal. Nothing was changed." : r.error.message);
    onClose();
    toast({
      text: "Account archived.",
      actionLabel: "Undo",
      onAction: async () => {
        await call("POST", `/accounts/${account.id}/restore`);
        router.refresh();
      },
    });
    router.refresh();
  };

  const clear = (field: string) => setErrors((p) => (field in p ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== field)) : p));
  const inv = (field: string) => ({ "aria-invalid": errors[field] ? true : undefined, "aria-describedby": errors[field] ? `a-${field}-err` : undefined }) as const;
  const err = (field: string) => (errors[field] ? <p className="field-error" id={`a-${field}-err`}>! {errors[field]}</p> : null);

  return (
    <form
      className="stack"
      style={{ marginTop: 0 }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {failure && <FailureBanner message={failure} retry={save} />}
      {conflict && <FailureBanner message={conflict} retry={() => { onClose(); router.refresh(); }} retryLabel="Reload" />}
      <div className="field">
        <label className="label" htmlFor="a-name">Name</label>
        <input id="a-name" className="field-input" placeholder="e.g. Funded 50K" value={name} autoComplete="off" autoFocus
          onChange={(e) => { setName(e.target.value); clear("name"); }} {...inv("name")} />
        {err("name")}
      </div>
      <div className="field">
        <label className="label" htmlFor="a-currency">Currency</label>
        <select id="a-currency" className="field-input" value={currency} onChange={(e) => { setCurrency(e.target.value); clear("currency"); }} {...inv("currency")}>
          {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {err("currency")}
      </div>
      <div className="field">
        <label className="label" htmlFor="a-start">Trading-day start (optional)</label>
        <input id="a-start" className="field-input" placeholder="e.g. 17:00" inputMode="numeric" value={start} autoComplete="off"
          onChange={(e) => { setStart(e.target.value); clear("tradingDayStart"); }} {...inv("tradingDayStart")} />
        {err("tradingDayStart")}
        <p className="helper">Leave the start empty to use the calendar date of each exit. Example: with 17:00, a trade that exits at 17:30 counts to the next day.</p>
      </div>
      {account && (
        <div className="stack-md">
          <p className="helper">Changing the start time moves this account&apos;s trades to the right trading days.</p>
          <p className="helper">Changing the currency only changes the label. Existing results are not converted.</p>
        </div>
      )}
      <div className="form-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="btn" disabled={saving}>Save account</button>
        <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
        {waiting && <Waiting label="Saving…" />}
        <span className="spacer" />
        {account && !account.archived && (
          <button type="button" className="btn-quiet" disabled={saving} onClick={archive}>Archive account</button>
        )}
      </div>
    </form>
  );
}
