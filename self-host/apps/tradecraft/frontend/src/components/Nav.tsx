"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartCandlestick, ClipboardCheck, ScrollText, Settings, TriangleAlert, Wallet } from "lucide-react";

// Reviews: a checked clipboard (the review you tick off). Trades: candlesticks. Mistakes: a warning triangle.
// Accounts: a wallet. Audit log: a scroll (the record). Settings: the cog.
const items = [
  { href: "/reviews", label: "Reviews", Icon: ClipboardCheck },
  { href: "/trades", label: "Trades", Icon: ChartCandlestick },
  { href: "/mistakes", label: "Mistakes", Icon: TriangleAlert },
  { href: "/accounts", label: "Accounts", Icon: Wallet },
  { href: "/audit", label: "Audit log", Icon: ScrollText },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={path === href || path.startsWith(href + "/") ? "page" : undefined}>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
