"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { GeocodeResult } from "@/app/api/geocode/route";
import ResortCard from "@/components/ResortCard";
import type { MapFocus } from "@/components/ResortMap";
import type { ForecastResponse, ResortForecast } from "@/lib/forecast";
import { PASS_COLORS } from "@/lib/format";
import { distanceMiles, type LatLon } from "@/lib/geo";
import { PASSES, resorts, type Pass } from "@/lib/resorts";

// Leaflet touches `window`, so the map only renders in the browser.
const ResortMap = dynamic(() => import("@/components/ResortMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading map…</div>,
});

type SortKey = "distance" | "next7" | "past7" | "name";
type Origin = LatLon & { label: string };

const NEARBY_ZOOM = 8;

export default function SnowApp() {
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [activePasses, setActivePasses] = useState<Set<Pass>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const [forecasts, setForecasts] = useState<Record<string, ResortForecast> | null>(null);
  const [forecastState, setForecastState] = useState<"loading" | "error" | "ready">("loading");

  const cardRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    fetch("/api/forecast")
      .then((res) => (res.ok ? (res.json() as Promise<ForecastResponse>) : Promise.reject()))
      .then((data) => {
        setForecasts(data.forecasts);
        setForecastState("ready");
      })
      .catch(() => setForecastState("error"));
  }, []);

  function centerOn(next: Origin) {
    setOrigin(next);
    setSortKey("distance");
    setFocus({ lat: next.lat, lon: next.lon, zoom: NEARBY_ZOOM, key: Date.now() });
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLocating(true);
    setLocationError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Location lookup failed");
      const result = data as GeocodeResult;
      centerOn({ lat: result.lat, lon: result.lon, label: result.label });
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Location lookup failed");
    } finally {
      setLocating(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        centerOn({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" });
      },
      () => {
        setLocating(false);
        setLocationError("Couldn't get your location. Try typing a city or zip instead.");
      },
    );
  }

  function togglePass(pass: Pass) {
    setActivePasses((prev) => {
      const next = new Set(prev);
      if (next.has(pass)) next.delete(pass);
      else next.add(pass);
      return next;
    });
  }

  function selectResort(id: string, from: "map" | "list") {
    const isDeselect = from === "list" && id === selectedId;
    setSelectedId(isDeselect ? null : id);
    if (isDeselect) return;
    if (from === "list") {
      const resort = resorts.find((r) => r.id === id);
      if (resort) setFocus({ lat: resort.lat, lon: resort.lon, zoom: NEARBY_ZOOM + 1, key: Date.now() });
    } else {
      cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const visible = useMemo(() => {
    // No chips selected means "show everything"; otherwise match any selected pass.
    const filtered = resorts.filter(
      (r) => activePasses.size === 0 || r.passes.some((p) => activePasses.has(p)),
    );
    const withDistance = filtered.map((resort) => ({
      resort,
      distance: origin ? distanceMiles(origin, resort) : null,
    }));
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
  }, [activePasses, origin, sortKey, forecasts]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Northeast Snow Report</h1>
        <p className="text-sm text-zinc-500">Snowfall and forecasts for ski resorts in VT, NH, ME and NY.</p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <label htmlFor="location" className="sr-only">City or zip code</label>
          <input
            id="location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City or zip code, e.g. Boston, MA or 05672"
            className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none sm:w-auto sm:flex-1"
          />
          <button
            type="submit"
            disabled={locating}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {locating ? "Finding…" : "Search"}
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
          >
            Use my location
          </button>
        </form>
        {locationError && <p className="text-sm text-red-600">{locationError}</p>}
        {origin && !locationError && (
          <p className="text-sm text-zinc-600">Showing resorts near {origin.label}.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Pass:</span>
          {PASSES.map((pass) => {
            const active = activePasses.has(pass);
            return (
              <button
                key={pass}
                type="button"
                onClick={() => togglePass(pass)}
                aria-pressed={active}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
                style={
                  active
                    ? { backgroundColor: PASS_COLORS[pass], borderColor: PASS_COLORS[pass], color: "#fff" }
                    : { borderColor: "#d4d4d8" }
                }
              >
                {!active && (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PASS_COLORS[pass] }} />
                )}
                {pass}
              </button>
            );
          })}
          {activePasses.size > 0 && (
            <button
              type="button"
              onClick={() => setActivePasses(new Set())}
              className="text-sm text-zinc-500 underline hover:text-zinc-900"
            >
              Clear
            </button>
          )}

          <label className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
            Sort by
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
            >
              <option value="distance" disabled={!origin}>Distance</option>
              <option value="next7">Snow in next 7 days</option>
              <option value="past7">Snow in last 7 days</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </section>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="h-80 overflow-hidden rounded-lg border border-zinc-200 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <ResortMap
            resorts={visible.map((v) => v.resort)}
            forecasts={forecasts}
            selectedId={selectedId}
            onSelect={(id) => selectResort(id, "map")}
            origin={origin}
            focus={focus}
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-zinc-500">
            {visible.length} {visible.length === 1 ? "resort" : "resorts"}
          </p>
          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              No resorts match that pass filter.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map(({ resort, distance }) => (
                <ResortCard
                  key={resort.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(resort.id, el);
                    else cardRefs.current.delete(resort.id);
                  }}
                  resort={resort}
                  forecast={forecasts?.[resort.id]}
                  forecastState={forecastState}
                  distance={distance}
                  selected={resort.id === selectedId}
                  onSelect={() => selectResort(resort.id, "list")}
                />
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-zinc-500">
            Weather data from <a className="underline" href="https://open-meteo.com/">Open-Meteo</a>. Snow depth is
            modeled, not resort-reported. Forecasts refresh every 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
