"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { onMyPasses, useAppState, type Origin } from "@/components/AppState";
import FavoriteButton from "@/components/FavoriteButton";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import { ResortRow } from "@/components/ResortEntries";
import type { MapFocus } from "@/components/ResortMap";
import SiteHeader from "@/components/SiteHeader";
import SortControl from "@/components/SortControl";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, formatTemp, resortColor } from "@/lib/format";
import { snowNote } from "@/lib/outlook";
import { resorts, resortPath, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

// WebGL only runs in the browser, so the map loads client-side.
const ResortMap = dynamic(() => import("@/components/ResortMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink-faint">Loading map…</div>,
});

// Wide enough from any Northeast town to take in the nearest resorts, which are often 100+ miles out.
const NEARBY_ZOOM = 7;

/** What you see when you tap a dot: enough to decide whether to open the mountain. */
function PreviewCard({
  resort,
  forecast,
  distance,
  onClose,
}: {
  resort: Resort;
  forecast: ResortForecast | undefined;
  distance: number | null;
  onClose: () => void;
}) {
  const snow = forecast?.next7In ?? 0;
  const note = forecast && snowNote(forecast);
  const meta = [resort.passes[0] ?? "Independent", resort.state, distance !== null && `${Math.round(distance)} mi`].filter(Boolean);

  return (
    <section
      aria-label={resort.name}
      className="absolute inset-x-3 bottom-3 z-10 rounded-[20px] bg-white p-4 shadow-[0_8px_30px_rgb(15_26_42/0.18)] lg:right-auto lg:w-[380px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-hero truncate text-[26px] leading-none [font-stretch:80%]">{resort.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: resortColor(resort.passes) }} />
            {meta.join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chip text-ink-muted hover:bg-line"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </div>

      {forecast && (
        <div className="mt-3 flex items-end gap-5 tabular-nums">
          <div>
            <div className={`type-figure text-[22px] ${snow >= 0.1 ? "text-ink" : "text-ink-zero"}`}>{formatInches(snow)}</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">next 7 days</div>
          </div>
          <div>
            <div className="type-figure text-[22px]">{formatTemp(forecast.tempF)}</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">now</div>
          </div>
          {note && (
            <p className={`min-w-0 flex-1 truncate pb-0.5 text-right text-[13px] ${note.tone === "none" ? "text-ink-faint" : "text-glacier"}`}>
              {note.text}
            </p>
          )}
        </div>
      )}

      <div className="mt-3.5 flex gap-2">
        <Link
          href={resortPath(resort.id)}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white hover:bg-navy-2"
        >
          View mountain
        </Link>
        <FavoriteButton id={resort.id} name={resort.name} variant="tile" />
      </div>
    </section>
  );
}

export default function Explore() {
  const { forecasts, forecastState, origin, distanceTo, myPasses, favoriteIds, sortKey, setSortKey } = useAppState();

  const [view, setView] = useState<"map" | "list">("map");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = selectedId ? visible.find((v) => v.resort.id === selectedId) : undefined;
  const passLabel = myPasses.length ? `${myPasses.join(" & ")} ` : "";

  const controls = (
    <div className="flex flex-col gap-2">
      <div className="flex h-[46px] items-center gap-2.5 rounded-[14px] bg-white px-3.5 shadow-[0_2px_12px_rgb(15_26_42/0.10)]">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20 L16 16" />
        </svg>
        <label htmlFor={`resort-search-${view}`} className="sr-only">
          Search mountains
        </label>
        <input
          id={`resort-search-${view}`}
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
        <div className="rounded-[14px] bg-white p-3 shadow-[0_2px_12px_rgb(15_26_42/0.10)]">
          <LocationSearch onLocated={handleLocated} startEditing />
        </div>
      )}
      <div className="flex items-center gap-2">
        <PassPicker className="flex-1" />
        <button
          type="button"
          onClick={() => {
            setView(view === "map" ? "list" : "map");
            setSelectedId(null);
          }}
          className="flex h-8 shrink-0 items-center rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white lg:hidden"
        >
          {view === "map" ? "List" : "Map"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <h1 className="sr-only">Explore resorts</h1>

      <div className="mx-auto w-full max-w-[1400px] flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-4 lg:px-5 lg:pb-8">
        {/* The map, with search and filters floating over it. On phones it is the whole view. */}
        <section
          aria-label="Resort map"
          className={`relative h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] min-h-[420px] overflow-hidden bg-snow lg:sticky lg:top-4 lg:block lg:h-[calc(100vh-6rem)] lg:rounded-[18px] lg:shadow-[0_1px_2px_rgb(15_26_42/0.05),0_10px_30px_rgb(15_26_42/0.06)] ${
            view === "map" ? "" : "hidden"
          }`}
        >
          <ResortMap
            resorts={visible.map((v) => v.resort)}
            favoriteIds={favoriteIds}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            origin={origin}
            focus={focus}
          />
          <div className="absolute inset-x-3 top-3 z-10">{controls}</div>
          {selected && (
            <PreviewCard
              resort={selected.resort}
              forecast={forecasts?.[selected.resort.id]}
              distance={selected.distance}
              onClose={() => setSelectedId(null)}
            />
          )}
        </section>

        {/* The list: its own view on phones, a column beside the map on desktop. */}
        <section aria-label="Resorts" className={`px-3 pb-6 lg:block lg:px-0 lg:pb-0 ${view === "list" ? "" : "hidden"}`}>
          {view === "list" && <div className="pb-3 lg:hidden">{controls}</div>}
          <div className="sheet pb-2">
            <div className="flex items-baseline justify-between px-[18px] pt-4 pb-1.5">
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
          </div>
          <p className="px-2 pt-3 text-xs text-ink-faint">
            Forecasts from{" "}
            <a className="underline" href="https://open-meteo.com/">
              Open-Meteo
            </a>
            . Snow is modeled, not resort-reported.
          </p>
        </section>
      </div>
    </div>
  );
}
