'use client';

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { ResumeRequestProvider } from "@/components/ResumeRequestModal";

// useSearchParams() opts the tree into client rendering, so it's isolated behind
// Suspense here rather than bailing out the whole app.
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const client = usePostHog();

  useEffect(() => {
    if (!pathname || !client) return;
    const query = searchParams.toString();
    client.capture("$pageview", {
      $current_url: query ? `${window.origin}${pathname}?${query}` : `${window.origin}${pathname}`,
    });
  }, [pathname, searchParams, client]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SessionProvider>
        <PostHogProvider client={posthog}>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <ResumeRequestProvider>{children}</ResumeRequestProvider>
        </PostHogProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
