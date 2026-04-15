'use client';

import * as React from 'react';
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider>
      {mounted ? (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      ) : (
        <div style={{ visibility: 'hidden' }}>{children}</div>
      )}
    </SessionProvider>
  );
}