import type { NextConfig } from "next";

const config: NextConfig = {
  // the Dockerfile copies .next/standalone, so the image needs no node_modules
  output: "standalone",
  poweredByHeader: false,
  // This app is never meant to be shown inside another page: a framed copy could be clicked through (the owner's
  // changes that need a recent confirmation included). frame-ancestors is the one CSP directive that cannot break a page.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default config;
