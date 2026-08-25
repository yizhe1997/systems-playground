import posthog from "posthog-js";

// Runs once on the client before hydration (Next's client instrumentation hook - the
// browser-side counterpart to src/instrumentation.ts, which only runs on the server).
// No-ops without a key so local dev and PR preview builds don't emit real analytics.
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // Same-origin path, rewritten to PostHog by next.config.ts - keeps ingestion off
    // third-party domains so ad blockers/tracking prevention don't silently drop events.
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    capture_pageview: false, // captured manually in providers.tsx - App Router has no route-change event to hook
    person_profiles: "identified_only",
  });
}
