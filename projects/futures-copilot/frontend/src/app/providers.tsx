'use client';

import * as React from 'react';
import { SessionProvider } from "next-auth/react";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
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
  const appProviders = (
    <SessionProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!recaptchaSiteKey) {
    return appProviders;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      {appProviders}
    </GoogleReCaptchaProvider>
  );
}