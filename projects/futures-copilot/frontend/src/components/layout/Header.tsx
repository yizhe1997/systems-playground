'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => { 
    const t = setTimeout(() => setMounted(true), 0); 
    return () => clearTimeout(t); 
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-black border-b border-black dark:border-white">
      <div className="flex justify-between items-center px-4 md:px-8 py-4">
        <Link href="/" className="font-mono text-sm uppercase tracking-widest font-bold hover:opacity-50 transition-opacity flex items-center gap-2">
          <div className="w-2 h-2 bg-black dark:bg-white" />
          FUTURES COPILOT
        </Link>
        
        <div className="flex items-center gap-6">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity"
              title="Toggle Theme"
            >
              [ {theme === 'dark' ? 'LIGHT' : 'DARK'} ]
            </button>
          )}

          {status === 'loading' ? (
             <div className="font-mono text-xs uppercase tracking-widest opacity-50 ml-2">...</div>
          ) : session ? (
            <div className="flex items-center gap-4 ml-2">
              <Link href="/dashboard" className="font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity">
                DASHBOARD
              </Link>
              <div className="hidden md:flex font-mono text-[10px] uppercase tracking-widest opacity-60">
                {session.user?.name} [{(session.user as any)?.role || 'ANON'}]
              </div>
              <button 
                onClick={() => signOut()}
                className="font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity"
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signIn('google')}
              className="font-mono text-xs uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black px-4 py-2 hover:opacity-80 transition-opacity flex items-center gap-2 ml-2"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              SIGN IN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
