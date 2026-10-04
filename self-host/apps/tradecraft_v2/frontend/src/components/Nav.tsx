"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/reviews", label: "Reviews" },
  { href: "/trades", label: "Trades" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/accounts", label: "Accounts" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path === i.href || path.startsWith(i.href + "/") ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
