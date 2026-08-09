'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ClickEffects from '@/components/originkit/clickeffects';

const navLinks = [
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

export default function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[100]">
        <ClickEffects interactionMode="burst" duration={0.4} strokeWidth={3} effectSize={70} showLabel={false} />
      </div>
      <header className="sticky top-0 z-50 w-full h-20 bg-[var(--ds-yellow)] border-b-2 border-black flex items-center">
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex items-center gap-2 group justify-self-start" aria-label="Home">
          <div
            className="w-10 h-10 flex items-center justify-center bg-black text-[var(--ds-yellow)] text-sm border-2 border-black group-hover:rotate-6 transition-transform"
            style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, borderRadius: '0.5rem' }}
          >
            YZ
          </div>
          <span
            className="font-extrabold text-lg tracking-tight text-black"
            style={{ fontFamily: 'var(--ds-font-display)' }}
          >
            Portfolio
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-8 font-bold text-sm justify-self-center">
          {navLinks.map((link) => (
            // py-3 -my-3 expands the tap target to WCAG 2.2's 24px AA floor
            // (closer to the 44px mobile guideline) without changing the
            // visible gap between links - the negative margin cancels the
            // padding's effect on surrounding layout.
            <Link
              key={link.href}
              href={link.href}
              className="inline-block py-3 -my-3 hover:opacity-70 transition-opacity"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="sm:hidden justify-self-end">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button aria-label="Open navigation" className="p-2.5 -mr-2.5 text-black">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-white border-l-2 border-black w-[260px] p-6 flex flex-col gap-6"
              style={{ boxShadow: 'none' }}
            >
              <SheetHeader>
                <SheetTitle className="text-left text-sm font-bold">Navigate</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col font-bold text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    </>
  );
}
