'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';

const navLinks = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/creator', label: 'CREATOR STUDIO' },
  { href: '/showroom', label: 'SHOWROOM' },
  { href: '/subscriber', label: 'SUBSCRIBER SETTINGS' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('gc-copilot-theme');
    const initialTheme: ThemeMode = saved === 'light' ? 'light' : 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('gc-copilot-theme', nextTheme);
  }

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 border-b border-hairline sidebar-shell">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-mono text-xs tracking-[0.22em] text-gold">GC COPILOT</span>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </header>

      <aside
        className={`sidebar-shell fixed left-0 top-0 z-50 h-screen w-64 border-r border-hairline p-6 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        aria-label="Primary navigation"
      >
        <div className="flex h-full flex-col">
          <div className="space-y-3">
            <p className="font-mono text-xs tracking-[0.24em] text-gold">GC COPILOT</p>
            <p className="font-mono text-[10px] tracking-[0.2em] text-secondary">[ GOLD FUTURES SIGNAL JOURNAL ]</p>
          </div>

          <div className="my-6 hairline-h" />

          <nav className="space-y-3">
            {navLinks.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block font-mono text-[11px] tracking-[0.18em] transition-colors ${active ? 'text-gold' : 'text-secondary hover:text-gold'}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {active ? '▸ ' : ''}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="hairline-h" />
            <button type="button" className="theme-toggle w-full" onClick={toggleTheme}>
              THEME: {theme.toUpperCase()}
            </button>
            <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">UTC TERMINAL ACTIVE</p>
          </div>
        </div>
      </aside>
    </>
  );
}
