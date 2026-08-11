import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@aurixa/ui-kit"],
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/patients", destination: "/clients", permanent: false },
      { source: "/patients/:path*", destination: "/clients/:path*", permanent: false },
      { source: "/appointments", destination: "/showings", permanent: false },
      { source: "/appointments/:path*", destination: "/showings/:path*", permanent: false },
    ];
  },
};

export default config;
