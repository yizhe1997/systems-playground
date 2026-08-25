'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ResumeRequestProvider } from "@/components/ResumeRequestModal";
import { McpConnectProvider } from "@/components/McpConnectModal";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SessionProvider>
        <ResumeRequestProvider>
          <McpConnectProvider>{children}</McpConnectProvider>
        </ResumeRequestProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
