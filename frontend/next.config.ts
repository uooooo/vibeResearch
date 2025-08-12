import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Do not block builds on ESLint errors; surface via `bun run lint` instead
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
