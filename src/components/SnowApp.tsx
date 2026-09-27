"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { GeocodeResult } from "@/app/api/geocode/route";
import { CountUpContext } from "@/components/CountUp";
import Hero from "@/components/Hero";
import { FeaturedResort, ResortRow } from "@/components/ResortEntries";
import type { MapFocus } from "@/components/ResortMap";
import SortControl, { type SortKey } from "@/components/SortControl";
import type { ForecastResponse, ResortForecast } from "@/lib/forecast";
import { PASS_COLORS } from "@/lib/format";
import { distanceMiles, type LatLon } from "@/lib/geo";
import { PASSES, resorts, type Pass } from "@/lib/resorts";

// Leaflet touches `window`, so the map only renders in the browser.
const ResortMap = dynamic(() => import("@/components/ResortMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-snow/60">Loading map…</div>,
});

type Origin = LatLon & { label: string };

const NEARBY_ZOOM = 8;
const COUNT_UP_WINDOW_MS = 1500;

const entryId = (resortId: string) => `resort-${resortId}`;

const FEATURED_LABEL: Record<SortKey, string | null> = {
  distance: "Nearest to you",
  next7: "Most snow coming",
  past7: "Most recent snow",
  name: null,
};

export default function SnowApp() {
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [activePasses, setActivePasses] = useState<Set<Pass>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("next7");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const [forecasts, setForecasts] = useState<Record<string, ResortForecast> | null>(null);
  const [forecastState, setForecastState] = useState<"loading" | "error" | "ready">("loading");
  const [countingUp, setCountingUp] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    fetch("/api/forecast")
      .then((res) => (res.ok ? (res.json() as Promise<ForecastResponse>) : Promise.reject()))
      .then((data) => {
        setForecasts(data.forecasts);
        setForecastState("ready");
        setCountingUp(true);
        timer = setTimeout(() => setCountingUp(false), COUNT_UP_WINDOW_MS);
      })
      .catch(() => setForecastState("error"));
    return () => clearTimeout(timer);
  }, []);

  // `key` changes on every request so the map re-centers even on the same spot.
  function flyTo(point: LatLon, zoom: number) {
    setFocus((prev) => ({ ...point, zoom, key: (prev?.key ?? 0) + 1 }));
  }

  function centerOn(next: Origin) {
    setOrigin(next);
    setSortKey("distance");
    flyTo(next, NEARBY_ZOOM);
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
      if (resort) flyTo(resort, NEARBY_ZOOM + 1);
    } else {
      document.getElementById(entryId(id))?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  // Snow rankings mean nothing until forecasts arrive, so hold the featured card until then.
  const featuredLabel =
    sortKey === "distance" || forecastState === "ready" ? FEATURED_LABEL[sortKey] : null;
  const featured = featuredLabel ? visible[0] : undefined;
  const rest = featuredLabel ? visible.slice(1) : visible;

  const entryProps = ({ resort, distance }: (typeof visible)[number]) => ({
    resort,
    distance,
    forecast: forecasts?.[resort.id],
    forecastState,
    selected: resort.id === selectedId,
    hovered: resort.id === hoveredId,
    onSelect: () => selectResort(resort.id, "list"),
    onHover: (hovering: boolean) => setHoveredId(hovering ? resort.id : null),
  });

  const heroStatus = locationError
    ? { kind: "error" as const, text: locationError }
    : origin
      ? { kind: "info" as const, text: `Showing resorts near ${origin.label}.` }
      : null;

  return (
    <MotionConfig reducedMotion="user">
      <CountUpContext.Provider value={countingUp}>
        <Hero
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onUseMyLocation={handleUseMyLocation}
          locating={locating}
          status={heroStatus}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pb-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink-muted">Pass</span>
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
                        : { borderColor: "var(--line)", backgroundColor: "#fff" }
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
                  className="text-sm text-ink-muted underline hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
            <SortControl value={sortKey} onChange={setSortKey} distanceAvailable={origin !== null} />
          </div>

          <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
            <section
              aria-label="Resort map"
              className="flex h-96 flex-col overflow-hidden rounded-lg bg-navy bg-[url(/topo.svg)] bg-cover bg-center p-2 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]"
            >
              <div className="flex items-center justify-between px-1.5 pt-0.5 pb-2 text-snow">
                <h2 className="font-display text-xl tracking-wider">Resort Map</h2>
                <ul className="flex items-center gap-3 text-xs text-snow/80">
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
                </ul>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-md">
                <ResortMap
                  resorts={visible.map((v) => v.resort)}
                  forecasts={forecasts}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={(id) => selectResort(id, "map")}
                  onHover={setHoveredId}
                  origin={origin}
                  focus={focus}
                />
              </div>
            </section>

            <section aria-label="Resorts" className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                {visible.length} {visible.length === 1 ? "resort" : "resorts"}
              </p>

              <AnimatePresence initial={false} mode="popLayout">
                {featured && featuredLabel && (
                  <motion.div
                    key={`featured-${featured.resort.id}`}
                    id={entryId(featured.resort.id)}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25 }}
                    className="scroll-mt-4"
                  >
                    <FeaturedResort label={featuredLabel} {...entryProps(featured)} />
                  </motion.div>
                )}
              </AnimatePresence>

              {rest.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-line bg-white">
                  <div className="hidden grid-cols-[minmax(0,1fr)_repeat(4,3.25rem)] gap-x-2 border-b border-line px-4 py-2 text-right text-[11px] font-semibold tracking-wide whitespace-nowrap text-ink-muted uppercase sm:grid">
                    <span className="text-left">Resort</span>
                    <span>Next 7</span>
                    <span>Last 7</span>
                    <span title="Modeled snow on the ground, not the resort-reported base">Depth ⓘ</span>
                    <span>Now</span>
                  </div>
                  <ul>
                    <AnimatePresence initial={false} mode="popLayout">
                      {rest.map((entry) => (
                        <motion.li
                          key={entry.resort.id}
                          id={entryId(entry.resort.id)}
                          layout="position"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                          transition={{ duration: 0.25 }}
                          className="scroll-mt-4"
                        >
                          <ResortRow {...entryProps(entry)} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}

              {visible.length === 0 && (
                <p className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-ink-muted">
                  No resorts match that pass filter.
                </p>
              )}

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
      </CountUpContext.Provider>
    </MotionConfig>
  );
}
