import type { NextConfig } from "next";

const config: NextConfig = {
  // the Dockerfile copies .next/standalone, so the image needs no node_modules
  output: "standalone",
};

export default config;
