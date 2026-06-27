import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Turbopack native polling configuration for Docker-on-Windows
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
