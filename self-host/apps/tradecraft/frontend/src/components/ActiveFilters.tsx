import Link from "next/link";
import type { Mistake } from "@/lib/types";

// The filters a breakdown row of Analytics opens on the Trades list (feature 005). Only well-formed values are kept, so
// an edited address cannot make the list refuse itself.
const SHAPES: Record<string, RegExp> = {
  weekday: /^[1-7]$/,
  hour: /^([0-9]|1[0-9]|2[0-3])$/,
  instrument: /^.{1,40}$/,
  direction: /^(long|short)$/,
  mistakeId: /^[0-9a-fA-F-]{36}$/,
  plan: /^(followed|notfollowed|notjudged)$/,
};

const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PLAN: Record<string, string> = { followed: "Followed", notfollowed: "Not followed", notjudged: "Not judged yet" };

export function extraFilters(sp: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, re] of Object.entries(SHAPES)) {
    const raw = sp[k];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v && re.test(v)) out[k] = v;
  }
  return out;
}

const two = (n: string) => n.padStart(2, "0");

function chipText(k: string, v: string, mistakes: Mistake[]): string {
  switch (k) {
    case "weekday": return `Weekday: ${WEEKDAYS[Number(v)]}`;
    case "hour": return `Hour: ${two(v)}:00 to ${two(v)}:59`;
    case "instrument": return `Instrument: ${v}`;
    case "direction": return `Direction: ${v === "long" ? "Long" : "Short"}`;
    case "mistakeId": return `Mistake: ${mistakes.find((m) => m.id === v)?.name ?? "unknown"}`;
    default: return `Plan: ${PLAN[v]}`;
  }
}

/** One chip for each active filter, each with a link that takes it away and keeps the rest. */
export function ActiveFilters({ extra, base, mistakes }: { extra: Record<string, string>; base: Record<string, string>; mistakes: Mistake[] }) {
  const without = (drop: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v || k === "from" || k === "to") q.set(k, v);
    for (const [k, v] of Object.entries(extra)) if (k !== drop) q.set(k, v);
    return `/trades?${q.toString()}`;
  };
  return (
    <ul className="chips" aria-label="Active filters">
      {Object.entries(extra).map(([k, v]) => (
        <li key={k} className="chip">
          {chipText(k, v, mistakes)}
          <Link href={without(k)} aria-label={`Remove the filter ${chipText(k, v, mistakes)}`} className="chip-x">×</Link>
        </li>
      ))}
    </ul>
  );
}
