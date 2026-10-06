import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compare became part of Decide; keep old links working.
  async redirects() {
    return [{ source: "/compare", destination: "/decide", permanent: true }];
  },
  // PostHog through our own domain, so ad blockers don't drop analytics (US cloud).
  async rewrites() {
    return [
      // Apps that ask for /favicon.ico directly get the Snowbox icon (pages link icon.svg).
      { source: "/favicon.ico", destination: "/apple-icon" },
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  // PostHog's API paths end in a slash; don't redirect them.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
