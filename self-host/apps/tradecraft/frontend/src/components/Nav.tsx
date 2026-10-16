"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartCandlestick, ClipboardCheck, ScrollText, Settings, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";

// Reviews: a checked clipboard (the review you tick off). Trades: candlesticks. Mistakes: a warning triangle.
// Accounts: a wallet. Audit log: a scroll (the record). Settings: the cog.
type Item = { href: string; label: string; Icon: LucideIcon; children?: { href: string; label: string }[] };

// The daily work first; what is set up, recorded and configured after it. Settings opens into its three pages.
const groups: { label: string; items: Item[] }[] = [
  {
    label: "Journal",
    items: [
      { href: "/reviews", label: "Reviews", Icon: ClipboardCheck },
      { href: "/trades", label: "Trades", Icon: ChartCandlestick },
      { href: "/mistakes", label: "Mistakes", Icon: TriangleAlert },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/accounts", label: "Accounts", Icon: Wallet },
      { href: "/audit", label: "Audit log", Icon: ScrollText },
      {
        href: "/settings",
        label: "Settings",
        Icon: Settings,
        children: [
          { href: "/settings", label: "General" },
          { href: "/settings/access", label: "Access" },
          { href: "/settings/integrations", label: "Integrations" },
        ],
      },
    ],
  },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {groups.map((g) => (
        <div className="nav-group" key={g.label}>
          <p className="nav-label" id={`nav-${g.label}`}>{g.label}</p>
          <ul aria-labelledby={`nav-${g.label}`}>
            {g.items.map(({ href, label, Icon, children }) => {
              const inside = path === href || path.startsWith(href + "/");
              return (
                <li key={href}>
                  {/* a parent with pages is "current" through its child, not itself */}
                  <Link href={href} className={children && inside ? "nav-open" : undefined} aria-current={!children && inside ? "page" : undefined}>
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </Link>
                  {children && inside && (
                    <ul className="nav-sub" aria-label={label}>
                      {children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} aria-current={path === c.href ? "page" : undefined}>{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
