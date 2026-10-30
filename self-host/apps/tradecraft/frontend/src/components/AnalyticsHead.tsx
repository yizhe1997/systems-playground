import Link from "next/link";
import type { View } from "@/lib/analytics";
import { viewHref } from "@/lib/analytics";

/** The title of Analytics and its two tabs. The tab keeps the period, the accounts and the band. */
export function AnalyticsHead({ view, active, subtitle }: { view: View; active: "statistics" | "replay"; subtitle: string }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="title">Analytics</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      <nav className="tabs" aria-label="Analytics">
        <Link href={viewHref("/analytics", view)} aria-current={active === "statistics" ? "page" : undefined} className="tab">Statistics</Link>
        <Link href={viewHref("/analytics/replay", view)} aria-current={active === "replay" ? "page" : undefined} className="tab">Rule replay and mistakes</Link>
      </nav>
    </div>
  );
}
