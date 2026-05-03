'use client';

import * as React from 'react';
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from '@/lib/theme-context';
import { ToastContext, useToastState } from '@/hooks/use-toast';
import { Toaster } from '@/components/Toaster';

type Theme = 'light' | 'dark';

function ToastProvider({ children }: { children: React.ReactNode }) {
  const value = useToastState();
  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export default function Providers({ children, initialTheme }: { children: React.ReactNode; initialTheme: Theme }) {
  return (
    <SessionProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}