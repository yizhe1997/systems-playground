import type { NextConfig } from "next";

// PostHog ingestion is proxied same-origin through /ingest (see src/instrumentation-client.ts)
// so ad blockers/tracking prevention don't drop analytics requests to a third-party domain.
// Defaults to PostHog's US cloud; override if the project lives in the EU region instead.
const POSTHOG_INGEST_HOST = process.env.POSTHOG_INGEST_HOST ?? "https://us.i.posthog.com";
const POSTHOG_ASSETS_HOST = process.env.POSTHOG_ASSETS_HOST ?? "https://us-assets.i.posthog.com";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS_HOST}/static/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_INGEST_HOST}/:path*` },
    ];
  },
  // Required alongside the /ingest rewrite above - PostHog's paths don't have trailing slashes.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
