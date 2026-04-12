import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SidebarNav } from '@/components/tradingcopilot/SidebarNav';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'GC COPILOT | Gold Futures Signal Journal',
  description: 'AI-powered signal journal for gold futures (GC contract). Track, analyze, and share trading signals with precision.',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-background text-primary">
        <SidebarNav />
        <div className="min-h-screen md:pl-64">
          {children}
        </div>
      </body>
    </html>
  );
}
