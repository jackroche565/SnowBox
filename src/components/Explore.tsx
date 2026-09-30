"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { onMyPasses, useAppState, type Origin } from "@/components/AppState";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import { ResortRow } from "@/components/ResortEntries";
import type { MapFocus } from "@/components/ResortMap";
import SiteHeader from "@/components/SiteHeader";
import SortControl from "@/components/SortControl";
import { PASS_COLORS } from "@/lib/format";
import { PASSES, resorts, resortPath } from "@/lib/resorts";

// Leaflet touches `window`, so the map only renders in the browser.
const ResortMap = dynamic(() => import("@/components/ResortMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-snow/60">Loading map…</div>,
});

// Wide enough from any Northeast town to take in the nearest resorts, which are often 100+ miles out.
const NEARBY_ZOOM = 7;

export default function Explore() {
  const router = useRouter();
  const { forecasts, forecastState, origin, distanceTo, myPasses, sortKey, setSortKey } = useAppState();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // The map frames every resort until the user searches a new starting point.
  const [focus, setFocus] = useState<MapFocus | null>(null);

  function handleLocated(next: Origin) {
    setSortKey("distance");
    // `key` changes on every search so the map re-centers even on the same spot.
    setFocus((prev) => ({ lat: next.lat, lon: next.lon, zoom: NEARBY_ZOOM, key: (prev?.key ?? 0) + 1 }));
  }

  const visible = useMemo(() => {
    const filtered = resorts.filter((r) => onMyPasses(r.passes, myPasses));
    const withDistance = filtered.map((resort) => ({ resort, distance: distanceTo(resort) }));
    return withDistance.sort((a, b) => {
      switch (sortKey) {
        case "distance":
          return (a.distance ?? 0) - (b.distance ?? 0);
        case "next7":
          return (forecasts?.[b.resort.id]?.next7In ?? -1) - (forecasts?.[a.resort.id]?.next7In ?? -1);
        case "past7":
          return (forecasts?.[b.resort.id]?.past7In ?? -1) - (forecasts?.[a.resort.id]?.past7In ?? -1);
        default:
          return a.resort.name.localeCompare(b.resort.name);
      }
    });
  }, [myPasses, distanceTo, sortKey, forecasts]);

  return (
    <MotionConfig reducedMotion="user">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-4 pb-10">
        <h1 className="sr-only">Explore resorts</h1>

        <div className="z-[1100] -mx-4 flex flex-col gap-3 px-4 py-2 sm:sticky sm:top-0 sm:bg-snow/95 sm:backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <PassPicker />
            <LocationSearch onLocated={handleLocated} className="min-w-0 sm:max-w-md sm:flex-1" />
          </div>
          <SortControl value={sortKey} onChange={setSortKey} distanceAvailable={origin !== null} className="w-full sm:w-auto" />
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_520px]">
          <section
            aria-label="Resort map"
            className="flex h-96 flex-col overflow-hidden rounded-lg bg-navy bg-[url(/topo.svg)] bg-cover bg-center p-2 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]"
          >
            <ul className="flex items-center justify-end gap-3 px-1.5 pt-0.5 pb-2 text-xs text-snow/80">
              {PASSES.map((pass) => (
                <li key={pass} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PASS_COLORS[pass] }} />
                  {pass}
                </li>
              ))}
              {origin && (
                <li className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-alpenglow ring-2 ring-white/80" />
                  You
                </li>
              )}
              <li className="text-snow/60">Bigger pin = more snow</li>
            </ul>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-md">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[401] bg-[url(/topo-map.svg)] bg-cover bg-center"
              />
              <ResortMap
                resorts={visible.map((v) => v.resort)}
                forecasts={forecasts}
                hoveredId={hoveredId}
                onSelect={(id) => router.push(resortPath(id))}
                onHover={setHoveredId}
                origin={origin}
                focus={focus}
              />
            </div>
          </section>

          <section aria-label="Resorts" className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_repeat(4,3.25rem)] gap-x-2 border-b border-line py-2 pr-[3.25rem] pl-4 text-right text-[11px] font-semibold tracking-wide whitespace-nowrap text-ink-muted uppercase sm:grid">
                <span className="text-left">{visible.length} resorts</span>
                <span>Next 7</span>
                <span>Last 7</span>
                <span title="Modeled snow on the ground, not the resort-reported base">Depth ⓘ</span>
                <span>Now</span>
              </div>
              <ul>
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map(({ resort, distance }) => (
                    <motion.li
                      key={resort.id}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                      transition={{ duration: 0.25 }}
                    >
                      <ResortRow
                        resort={resort}
                        distance={distance}
                        forecast={forecasts?.[resort.id]}
                        forecastState={forecastState}
                        href={resortPath(resort.id)}
                        hovered={resort.id === hoveredId}
                        onHover={(hovering) => setHoveredId(hovering ? resort.id : null)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            <p className="text-xs text-ink-muted">
              Weather data from{" "}
              <a className="underline" href="https://open-meteo.com/">
                Open-Meteo
              </a>
              . Snow depth is modeled, not resort-reported. Forecasts refresh every 30 minutes.
            </p>
          </section>
        </div>
      </main>
    </MotionConfig>
  );
}
