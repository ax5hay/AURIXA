import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@aurixa/ui-kit"],
  // No rewrites - use NEXT_PUBLIC_API_GATEWAY_URL directly (gateway has CORS *)
};

export default config;
