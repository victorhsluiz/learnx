import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained build in .next/standalone, used by
  // the production Docker image (see Dockerfile).
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

export default nextConfig;
