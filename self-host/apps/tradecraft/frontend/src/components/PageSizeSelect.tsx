"use client";

import { useRouter } from "next/navigation";
import { PAGE_SIZES, PAGE_SIZE_COOKIE } from "@/lib/pageSize";

/**
 * "Rows per page" for a list. Choosing a size remembers it (a cookie, one year) and reloads the list at its first page
 * with the size in the address. `params` is the list's own query (filters), which is kept.
 */
export function PageSizeSelect({ value, path, params, label = "Rows per page" }: { value: number; path: string; params: Record<string, string>; label?: string }) {
  const router = useRouter();
  return (
    <label className="page-size">
      <span>{label}</span>
      <select
        className="field-input"
        value={value}
        onChange={(e) => {
          document.cookie = `${PAGE_SIZE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
          const q = new URLSearchParams();
          for (const [k, v] of Object.entries(params)) q.set(k, v ?? "");
          q.set("size", e.target.value);
          router.push(`${path}?${q.toString()}`);
        }}
      >
        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}
