'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navLinks = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/creator/studio', label: 'CREATOR STUDIO' },
  { href: '/showroom', label: 'SHOWROOM' },
  { href: '/subscriber/alerts', label: 'ALERTS' },
];

function LiveClock() {
  const [time, setTime] = useState<string>('');
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const minutes = now.getUTCMinutes().toString().padStart(2, '0');
      const seconds = now.getUTCSeconds().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}Z`);
      
      // GC futures: Sunday 6PM - Friday 5PM ET (simplified check)
      const utcHour = now.getUTCHours();
      const day = now.getUTCDay();
      // Rough approximation: market open most weekdays
      setIsMarketOpen(day >= 1 && day <= 5 && (utcHour >= 0 || utcHour <= 22));
    }
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs tracking-wider text-secondary">
        GC / GOLD FUTURES
      </span>
      <span className="hairline-v h-3" />
      <span className="font-mono text-xs tracking-wider text-gold">
        {time}
      </span>
      <div className={`live-dot ${isMarketOpen ? 'pulse' : ''}`} style={{ backgroundColor: isMarketOpen ? '#4ADE80' : '#6B6560' }} />
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="hud-frame relative border-b border-hairline">
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        {/* Logo */}
        <Link href="/" className="font-mono text-sm tracking-widest text-gold hover:opacity-80 transition-opacity">
          GC COPILOT
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Live Clock */}
        <LiveClock />
      </nav>
      
      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center gap-4 px-6 pb-4 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link whitespace-nowrap ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
