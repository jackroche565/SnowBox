"use client";

import { useEffect, useState } from "react";
import type { CamsResponse } from "@/app/api/cams/route";
import type { Resort } from "@/lib/resorts";

// One request per visit for which cams are up, shared by every page.
let request: Promise<string[] | null> | null = null;

/** Ids of live cams that are currently up, or null while checking. */
export function useWorkingCams(): string[] | null {
  const [working, setWorking] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    request ??= fetch("/api/cams")
      .then((res) => (res.ok ? (res.json() as Promise<CamsResponse>) : null))
      .then((d) => d?.working ?? null)
      .catch(() => null);
    request.then((ids) => {
      if (!ids) request = null;
      if (!cancelled) setWorking(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return working;
}

export type Cam = { resort: Resort; youtube: string; title: string };

/** A resort's cams that are up right now. */
export function camsFor(resort: Resort, working: string[] | null): Cam[] {
  if (!working) return [];
  return (resort.liveCams ?? []).filter((c) => working.includes(c.youtube)).map((c) => ({ resort, ...c }));
}

/**
 * A live YouTube cam. Shows YouTube's still of the stream until tapped, so the page doesn't load
 * a video player per cam; tapping plays it, muted, in place.
 */
export default function LiveCam({ cam, showResort = false }: { cam: Cam; showResort?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const label = `${showResort ? `${cam.resort.name}, ` : ""}${cam.title}`;
  return (
    <figure className="min-w-0">
      <div className="relative aspect-video overflow-hidden bg-ink">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${cam.youtube}?autoplay=1&mute=1&playsinline=1&rel=0`}
            title={`${label}, live`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${label}, live`} className="group absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own still of the stream */}
            <img src={`https://i.ytimg.com/vi/${cam.youtube}/hqdefault_live.jpg`} alt="" className="h-full w-full object-cover" />
            <span className="absolute bottom-2 left-2 bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-snow">Live</span>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/80 text-snow group-hover:bg-ink">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
                  <path d="M7 4 L20 12 L7 20 Z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-1.5 text-[13px]">
        {showResort && <span className="font-semibold">{cam.resort.name} </span>}
        <span className="text-ink-muted">{cam.title}</span>
      </figcaption>
    </figure>
  );
}
