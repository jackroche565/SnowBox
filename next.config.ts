import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compare became part of Decide; keep old links working.
  async redirects() {
    return [{ source: "/compare", destination: "/decide", permanent: true }];
  },
};

export default nextConfig;
