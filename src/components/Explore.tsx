"use client";

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
import { INDEPENDENT_COLOR, PASS_COLORS } from "@/lib/format";
import { PASSES, resorts, resortPath } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

// WebGL only runs in the browser, so the map loads client-side.
const ResortMap = dynamic(() => import("@/components/ResortMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink-faint">Loading map…</div>,
});

// Wide enough from any Northeast town to take in the nearest resorts, which are often 100+ miles out.
const NEARBY_ZOOM = 7;

export default function Explore() {
  const router = useRouter();
  const { forecasts, forecastState, origin, distanceTo, myPasses, sortKey, setSortKey } = useAppState();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [settingFrom, setSettingFrom] = useState(false);
  // The map frames every resort until the user sets a new starting point.
  const [focus, setFocus] = useState<MapFocus | null>(null);

  function handleLocated(next: Origin) {
    setSortKey("distance");
    setSettingFrom(false);
    // `key` changes on every search so the map re-centers even on the same spot.
    setFocus((prev) => ({ lat: next.lat, lon: next.lon, zoom: NEARBY_ZOOM, key: (prev?.key ?? 0) + 1 }));
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = resorts.filter(
      (r) =>
        onMyPasses(r.passes, myPasses) &&
        (!q || r.name.toLowerCase().includes(q) || (US_STATES[r.state] ?? r.state).toLowerCase().startsWith(q)),
    );
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
  }, [query, myPasses, distanceTo, sortKey, forecasts]);

  const passLabel = myPasses.length ? `${myPasses.join(" & ")} ` : "";

  return (
    <div className="relative flex flex-1 flex-col">
      <SiteHeader />
      <h1 className="sr-only">Explore resorts</h1>

      <div className="mx-auto w-full max-w-[1400px] flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-4 lg:px-5 lg:pb-8">
        {/* Map, with search and filters floating over it */}
        <section
          aria-label="Resort map"
          className="relative h-[58vh] min-h-[400px] overflow-hidden bg-[#eef2f6] lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] lg:rounded-[18px] lg:shadow-[0_1px_2px_rgb(15_26_42/0.05),0_10px_30px_rgb(15_26_42/0.06)]"
        >
          <ResortMap
            resorts={visible.map((v) => v.resort)}
            forecasts={forecasts}
            hoveredId={hoveredId}
            onSelect={(id) => router.push(resortPath(id))}
            onHover={setHoveredId}
            origin={origin}
            focus={focus}
          />

          <div className="absolute inset-x-3 top-3.5 z-10 flex flex-col gap-2">
            <div className="flex h-[46px] items-center gap-2.5 rounded-[14px] bg-white px-3.5 shadow-[0_2px_10px_rgb(15_26_42/0.10)]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20 L16 16" />
              </svg>
              <label htmlFor="resort-search" className="sr-only">
                Search mountains
              </label>
              <input
                id="resort-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${resorts.length} mountains`}
                className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSettingFrom((v) => !v)}
                aria-expanded={settingFrom}
                className="shrink-0 text-[13px] whitespace-nowrap text-ink-muted hover:text-ink"
              >
                {origin ? (
                  <>
                    From <span className="font-semibold text-ink">{origin.label.split(",")[0]}</span>
                  </>
                ) : (
                  <span className="font-medium text-glacier">Set location</span>
                )}
              </button>
            </div>
            {settingFrom && (
              <div className="rounded-[14px] bg-white p-3 shadow-[0_2px_10px_rgb(15_26_42/0.10)]">
                <LocationSearch onLocated={handleLocated} startEditing />
              </div>
            )}
            <PassPicker floating />
          </div>

          <div className="pointer-events-none absolute bottom-8 left-3 z-10 rounded-[10px] bg-white/94 px-2.5 py-2 shadow-[0_1px_4px_rgb(15_26_42/0.10)] lg:bottom-4">
            <ul className="flex items-center gap-2.5 text-[11px] font-medium">
              {[...PASSES.map((p) => ({ label: p, color: PASS_COLORS[p] })), { label: "Independent", color: INDEPENDENT_COLOR }].map(
                (k) => (
                  <li key={k.label} className="flex items-center gap-1">
                    <span className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: k.color }} />
                    {k.label}
                  </li>
                ),
              )}
            </ul>
            <div className="mt-1 text-[11px] text-ink-faint">Bigger dot = more snow in the next 7 days</div>
          </div>
        </section>

        {/* The list: a sheet over the map on phones, a column beside it on desktop */}
        <section aria-label="Resorts" className="sheet relative z-10 -mt-6 rounded-b-none pb-4 lg:mt-0 lg:rounded-b-[18px]">
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 rounded-full bg-line lg:hidden" />
          <div className="flex items-baseline justify-between px-[18px] pt-2.5 pb-1.5 lg:pt-4">
            <h2 className="text-[15px] font-semibold">
              {visible.length} {passLabel}
              {visible.length === 1 ? "mountain" : "mountains"}
            </h2>
            <SortControl value={sortKey} onChange={setSortKey} distanceAvailable={origin !== null} />
          </div>
          <ul>
            {visible.map(({ resort, distance }) => (
              <li key={resort.id}>
                <ResortRow
                  resort={resort}
                  distance={distance}
                  forecast={forecasts?.[resort.id]}
                  forecastState={forecastState}
                  href={resortPath(resort.id)}
                  hovered={resort.id === hoveredId}
                  onHover={(hovering) => setHoveredId(hovering ? resort.id : null)}
                />
              </li>
            ))}
          </ul>
          {visible.length === 0 && <p className="px-[18px] py-4 text-sm text-ink-muted">No mountains match “{query}”.</p>}
          <p className="px-[18px] pt-4 text-xs text-ink-faint">
            Forecasts from{" "}
            <a className="underline" href="https://open-meteo.com/">
              Open-Meteo
            </a>
            , refreshed every 30 minutes. Snow is modeled, not resort-reported.
          </p>
        </section>
      </div>
    </div>
  );
}
