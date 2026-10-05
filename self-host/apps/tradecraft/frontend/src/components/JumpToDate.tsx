"use client";

import { useRouter } from "next/navigation";
import { monthOfDay } from "@/lib/format";

/** A date field that opens the week holding the chosen day. It shows today's date until another day is chosen. */
export function JumpToDate({ account, value }: { account: string; value: string }) {
  const router = useRouter();
  return (
    <div className="field">
      <label className="label" htmlFor="jump">Jump to date</label>
      <input
        id="jump"
        key={value}
        type="date"
        className="field-input"
        style={{ width: 170 }}
        defaultValue={value}
        onChange={(e) => e.target.value && router.push(`/reviews?account=${account}&month=${monthOfDay(e.target.value)}&open=${e.target.value}`)}
      />
    </div>
  );
}
