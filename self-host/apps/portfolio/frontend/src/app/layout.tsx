import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import Providers from "./providers";
import SiteCursor from "@/components/SiteCursor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Neo-Brutalist "Push Button" direction's type family (DESIGN.md, pinned by
// the operator) - separate from the Geist fonts above, which admin-adjacent
// surfaces still use via the shadcn --font-sans/-mono mapping. Cabinet
// Grotesk and Satoshi are both Fontshare fonts, not on Google Fonts - loaded
// via one combined Fontshare CDN link in the <head> below instead of
// next/font.

export const metadata: Metadata = {
  title: "SYSTEMS_PLAYGROUND // YZ",
  description: "Interactive Systems Playground & Portfolio",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@400,500,700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster />
        <SiteCursor />
      </body>
    </html>
  );
}
