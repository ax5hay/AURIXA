import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@aurixa/ui-kit"],
  reactStrictMode: true,
};

export default config;
