import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@aurixa/ui-kit"],
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/appointments", destination: "/showings", permanent: false },
      { source: "/appointments/:path*", destination: "/showings/:path*", permanent: false },
      { source: "/records", destination: "/showings", permanent: false },
      { source: "/results", destination: "/documents", permanent: false },
      { source: "/medications", destination: "/maintenance", permanent: false },
      { source: "/refills", destination: "/maintenance", permanent: false },
      { source: "/billing", destination: "/financing", permanent: false },
      { source: "/insurance", destination: "/financing", permanent: false },
    ];
  },
};

export default config;
