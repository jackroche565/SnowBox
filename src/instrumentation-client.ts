import posthog from "posthog-js";

// Product analytics with PostHog. Runs once, before the app is interactive (Next.js loads this
// file on every page). With no token set, nothing is sent.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (token) {
  try {
    posthog.init(token, {
      // Events go through our own /ingest path (see next.config.ts), so ad blockers don't drop them.
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      // PostHog's recommended settings as of this date, including page views on client-side navigation.
      defaults: "2026-05-30",
    });
  } catch {
    // Analytics must never break the app.
  }
}
