import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@aurixa/ui-kit"],
  reactStrictMode: true,
  experimental: {
    // Avoid pnpm vendor-chunk resolution issues (MODULE_NOT_FOUND clsx)
    optimizePackageImports: ["clsx"],
  },
};

export default config;
