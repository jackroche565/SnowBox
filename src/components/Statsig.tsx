"use client";

import { StatsigProvider, useClientAsyncInit } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { useState, type ReactNode } from "react";

// Feature flags, experiments and web analytics with Statsig. Client-side only, so pages stay
// pre-built (Statsig's "bootstrap" setup would render every page on each request). With no client
// key set, this renders the page untouched.

function WithStatsig({ sdkKey, children }: { sdkKey: string; children: ReactNode }) {
  // Created once: page views, clicks and performance are captured automatically.
  const [options] = useState(() => ({ plugins: [new StatsigAutoCapturePlugin()] }));
  const { client } = useClientAsyncInit(sdkKey, {}, options);
  // No loading screen: the page renders right away and flags fill in when Statsig answers.
  return <StatsigProvider client={client}>{children}</StatsigProvider>;
}

export default function Statsig({ children }: { children: ReactNode }) {
  const sdkKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;
  if (!sdkKey) return <>{children}</>;
  return <WithStatsig sdkKey={sdkKey}>{children}</WithStatsig>;
}
