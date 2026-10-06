"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { onMyPasses, useAppState, type Origin } from "@/components/AppState";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import { passText } from "@/components/PassTags";
import { ResortRow } from "@/components/ResortEntries";
import type { MapFocus } from "@/components/ResortMap";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import SortControl from "@/components/SortControl";
import type { ResortForecast } from "@/lib/forecast";
import { estimateDriveHours, formatDrive } from "@/lib/decide";
import { SNOW_BUCKETS, formatInches, formatTemp } from "@/lib/format";
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
function PreviewPanel({
  resort,
  forecast,
  onClose,
}: {
  resort: Resort;
  forecast: ResortForecast | undefined;
  onClose: () => void;
}) {
  const { origin } = useAppState();
  const snow = forecast?.next7In ?? 0;
  const note = forecast && snowNote(forecast);
  const meta = [
    US_STATES[resort.state] ?? resort.state,
    passText(resort.passes),
    origin && `${formatDrive(estimateDriveHours(origin, resort))} drive (est.)`,
  ].filter(Boolean);
  const line = [note?.text, forecast && `${formatTemp(forecast.tempF)} now`].filter(Boolean).join(" · ");

  return (
    <section aria-label={resort.name} className="absolute inset-x-0 bottom-0 z-10 border-t border-ink bg-snow px-4 pt-3 pb-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] text-ink-muted tabular-nums">{meta.join(" · ")}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </div>
      <div className="mt-1 flex items-end justify-between gap-4">
        <h2 className="type-hero min-w-0 text-[40px]">{resort.name}</h2>
        {forecast && (
          <span className="shrink-0 text-right">
            <span className={`type-hero block text-[40px] ${snow >= 0.1 ? "text-glacier" : "text-ink-zero"}`}>{formatInches(snow)}</span>
            <span className="block text-[11px] text-ink-faint">next 7 days</span>
          </span>
        )}
      </div>
      {line && <p className="mt-2 text-[14px]">{line}</p>}
      <Link
        href={resortPath(resort.id)}
        className="mt-3 flex h-11 items-center justify-center bg-ink text-[15px] font-semibold text-snow hover:bg-navy-2"
      >
        View mountain
      </Link>
    </section>
  );
}

/** Small key for the dot colors, top left of the map. */
function Legend() {
  return (
    <div className="absolute top-3 left-3 z-10 bg-snow/90 px-2.5 py-2 text-[11px]">
      <p className="font-semibold">Next 7 days</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {SNOW_BUCKETS.map((b) => (
          <li key={b.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: b.color }} />
            {b.label}
          </li>
        ))}
      </ul>
    </div>
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
  const snow = useMemo(
    () => Object.fromEntries(Object.entries(forecasts ?? {}).map(([id, f]) => [id, f.next7In])),
    [forecasts],
  );

  // Rendered once above the map on phones and once above the list on desktop, so ids carry `where`.
  const controls = (where: "top" | "side") => (
    <div className="px-4 pt-3 pb-3 lg:px-0">
      <div className="flex items-end gap-4">
        <label htmlFor={`resort-search-${where}`} className="sr-only">
          Search mountains
        </label>
        <input
          id={`resort-search-${where}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${resorts.length} mountains`}
          className="min-w-0 flex-1 border-b-2 border-ink bg-transparent pb-1.5 text-[16px] placeholder:text-ink-faint focus:outline-none"
        />
        <PassPicker className="shrink-0 pb-1" />
      </div>
      <button
        type="button"
        onClick={() => setSettingFrom((v) => !v)}
        aria-expanded={settingFrom}
        className="mt-2.5 text-[13px] text-ink-muted hover:text-ink"
      >
        {origin ? (
          <>
            From <span className="font-semibold text-ink underline underline-offset-2">{origin.label.split(",")[0]}</span>
          </>
        ) : (
          <span className="font-semibold text-ink underline underline-offset-2">Set where you&apos;re starting from</span>
        )}
      </button>
      {settingFrom && <LocationSearch onLocated={handleLocated} startEditing className="mt-2.5" />}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        aside={
          <SegmentedControl
            label="View"
            value={view}
            onChange={(v) => {
              setView(v);
              setSelectedId(null);
            }}
            className="lg:hidden"
            segments={[
              { value: "map", label: "Map" },
              { value: "list", label: "List" },
            ]}
          />
        }
      />
      <h1 className="sr-only">Explore resorts</h1>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-6 lg:px-5 lg:pb-8">
        <div className="lg:hidden">{controls("top")}</div>

        {/* The map. On phones it is the whole view. */}
        <section
          aria-label="Resort map"
          className={`relative h-[calc(100dvh-13.5rem-env(safe-area-inset-bottom))] min-h-[380px] overflow-hidden border-t border-ink bg-snow lg:sticky lg:top-4 lg:mt-4 lg:block lg:h-[calc(100vh-6rem)] lg:border lg:border-ink ${
            view === "map" ? "" : "hidden"
          }`}
        >
          <ResortMap
            resorts={visible.map((v) => v.resort)}
            snow={snow}
            favoriteIds={favoriteIds}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            origin={origin}
            focus={focus}
          />
          <Legend />
          {selected && (
            <PreviewPanel resort={selected.resort} forecast={forecasts?.[selected.resort.id]} onClose={() => setSelectedId(null)} />
          )}
        </section>

        {/* The list: its own view on phones, a column beside the map on desktop. */}
        <section aria-label="Resorts" className={`pb-6 lg:block lg:pb-0 ${view === "list" ? "" : "hidden"}`}>
          <div className="hidden lg:block">{controls("side")}</div>
          <div className="rule-section flex items-baseline justify-between px-4 pt-3 pb-2 lg:mt-1">
            <h2 className="text-[13px] font-semibold">
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
          {visible.length === 0 && <p className="px-4 py-4 text-[15px] text-ink-muted">No mountains match “{query}”.</p>}
          <p className="rule-row px-4 pt-3 text-[11px] text-ink-faint">
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
