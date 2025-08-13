import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Do not block builds on ESLint errors; surface via `bun run lint` instead
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Prevent Turbopack from trying to bundle native/optional deps from Mastra
    // and platform-specific esbuild packages referenced transitively.
    serverComponentsExternalPackages: [
      "mastra",
      "esbuild",
      "@esbuild/darwin-arm64",
      "@esbuild/darwin-x64",
      "@esbuild/linux-x64",
    ],
  },
  webpack(config) {
    // Gracefully treat markdown files as raw source to avoid loader errors
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
