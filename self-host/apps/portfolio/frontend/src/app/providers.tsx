'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { ResumeRequestProvider } from "@/components/ResumeRequestModal";
import { McpConnectProvider } from "@/components/McpConnectModal";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {/* reducedMotion="user" makes every framer-motion animation in the app collapse to an
          instant opacity crossfade for visitors with prefers-reduced-motion set, instead of every
          entrance animation needing its own check. */}
      <MotionConfig reducedMotion="user">
        <SessionProvider>
          <ResumeRequestProvider>
            <McpConnectProvider>{children}</McpConnectProvider>
          </ResumeRequestProvider>
        </SessionProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
