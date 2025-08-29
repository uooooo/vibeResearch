import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Do not block builds on ESLint errors; surface via `bun run lint` instead
    ignoreDuringBuilds: true,
  },
  // Transpile ESM-only packages so they work in the Next server runtime
  transpilePackages: ["mastra"],
  // Keep heavy native deps externalized if needed
  serverExternalPackages: [
    "esbuild",
    "@esbuild/darwin-arm64",
    "@esbuild/darwin-x64",
    "@esbuild/linux-x64",
  ],
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
