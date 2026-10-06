"use client";

import { useEffect, useState } from "react";
import type { ObservedSnow } from "@/lib/observed";

// One request per visit, shared by every page that shows observed snow.
let request: Promise<ObservedSnow | null> | null = null;

/** NOAA's observed snowfall at every resort, or null while loading or if it's unavailable. */
export function useObserved(): ObservedSnow | null {
  const [observed, setObserved] = useState<ObservedSnow | null>(null);
  useEffect(() => {
    let cancelled = false;
    request ??= fetch("/api/observed")
      .then((res) => (res.ok ? (res.json() as Promise<ObservedSnow>) : null))
      .catch(() => null);
    request.then((data) => {
      if (!data) request = null; // try again next time
      if (!cancelled) setObserved(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return observed;
}

/** "Mon 8pm", the end of an observed window, in resort time. */
export function formatObservedEnd(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
  const hour = d.toLocaleTimeString("en-US", { hour: "numeric", timeZone: "America/New_York" });
  return `${day} ${hour.replace(" ", "").toLowerCase()}`;
}
