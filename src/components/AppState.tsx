"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CountUpContext } from "@/components/CountUp";
import type { SortKey } from "@/components/SortControl";
import type { ForecastResponse, ResortForecast } from "@/lib/forecast";
import { distanceMiles, type LatLon } from "@/lib/geo";
import { DEFAULT_REGION, isRegion, type RegionId } from "@/lib/regions";
import { INDEPENDENT, PASS_FILTERS, getResort, type Pass, type PassFilter } from "@/lib/resorts";

export type Origin = LatLon & { label: string };
export type ForecastState = "loading" | "error" | "ready";

const COUNT_UP_WINDOW_MS = 1500;

// Storage keys predate the Snowbox name. Renaming them would drop everyone's saved lists.
const STORAGE = {
  favorites: "snowline:favorites",
  passes: "snowline:passes",
  origin: "snowline:origin",
  region: "snowbox:region",
};

type AppState = {
  /** Forecasts for every region loaded so far, by resort id. Null until the first one arrives. */
  forecasts: Record<string, ResortForecast> | null;
  /** Whether the chosen region's forecasts are in. */
  forecastState: ForecastState;
  /** The same, for any region (a resort page's own region, say). */
  regionState: (region: RegionId) => ForecastState;

  /** The region Explore and Decide show, saved in this browser. */
  region: RegionId;
  setRegion: (region: RegionId) => void;
  /** Ask for a region's forecasts without switching to it (a resort page in another region). */
  requireRegion: (region: RegionId) => void;

  /** Where the user starts from, saved in this browser. */
  origin: Origin | null;
  setOrigin: (origin: Origin | null) => void;
  distanceTo: (point: LatLon) => number | null;

  /** Starred resorts, in the order they were starred. Shown on Home. */
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;

  /** Passes the user holds. Empty means "show every resort". */
  myPasses: PassFilter[];
  togglePass: (pass: PassFilter) => void;
  /** Replace the whole selection (All, Clear). */
  setPasses: (passes: PassFilter[]) => void;

  /** False until saved settings are read from this browser, so pages can avoid flashing an empty state. */
  savedListsReady: boolean;

  // Explore's sort lives here so it survives a trip to a resort page and back.
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
};

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used inside <AppStateProvider>");
  return state;
}

function readStored(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function readStoredIds(key: string): string[] {
  const parsed = readStored(key);
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
}

function readStoredOrigin(): Origin | null {
  const o = readStored(STORAGE.origin) as Partial<Origin> | null;
  return o && typeof o.lat === "number" && typeof o.lon === "number" && typeof o.label === "string"
    ? { lat: o.lat, lon: o.lon, label: o.label }
    : null;
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); settings still work for this visit.
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [forecasts, setForecasts] = useState<Record<string, ResortForecast> | null>(null);
  const [states, setStates] = useState<Partial<Record<RegionId, ForecastState>>>({});
  const [countingUp, setCountingUp] = useState(false);
  const [region, setRegion] = useState<RegionId>(DEFAULT_REGION);
  const [requested, setRequested] = useState<RegionId[]>([]);
  const started = useRef(new Set<RegionId>());

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [myPasses, setMyPasses] = useState<PassFilter[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("next7");


  // Saved settings are read after mount so the server-rendered HTML (which can't see
  // localStorage) matches the first client render.
  useEffect(() => {
    queueMicrotask(() => {
      setFavoriteIds(readStoredIds(STORAGE.favorites));
      setMyPasses(readStoredIds(STORAGE.passes).filter((p): p is PassFilter => (PASS_FILTERS as readonly string[]).includes(p)));
      setOrigin(readStoredOrigin());
      const storedRegion = readStored(STORAGE.region);
      if (isRegion(storedRegion)) setRegion(storedRegion);
      setStorageLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    writeStored(STORAGE.favorites, favoriteIds);
    writeStored(STORAGE.passes, myPasses);
    writeStored(STORAGE.origin, origin);
    writeStored(STORAGE.region, region);
  }, [favoriteIds, myPasses, origin, region, storageLoaded]);

  // Load each region once it's needed: the chosen one, your mountains' regions (Home), and any a
  // page asks for. The server caches each region, so this is cheap.
  const needed = useMemo(() => {
    const favoriteRegions = favoriteIds.flatMap((id) => getResort(id)?.region ?? []);
    return [...new Set<RegionId>([region, ...favoriteRegions, ...requested])];
  }, [region, requested, favoriteIds]);
  useEffect(() => {
    if (!storageLoaded) return;
    for (const r of needed) {
      if (started.current.has(r)) continue;
      started.current.add(r);
      setStates((prev) => ({ ...prev, [r]: "loading" }));
      fetch(`/api/forecast?region=${r}`)
        .then((res) => (res.ok ? (res.json() as Promise<ForecastResponse>) : Promise.reject()))
        .then((data) => {
          setForecasts((prev) => ({ ...prev, ...data.forecasts }));
          setStates((prev) => ({ ...prev, [r]: "ready" }));
          setCountingUp(true);
          setTimeout(() => setCountingUp(false), COUNT_UP_WINDOW_MS);
        })
        .catch(() => {
          started.current.delete(r); // try again next time it's needed
          setStates((prev) => ({ ...prev, [r]: "error" }));
        });
    }
  }, [needed, storageLoaded]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const togglePass = useCallback((pass: PassFilter) => {
    setMyPasses((prev) => (prev.includes(pass) ? prev.filter((p) => p !== pass) : PASS_FILTERS.filter((p) => p === pass || prev.includes(p))));
  }, []);
  const setPasses = useCallback((passes: PassFilter[]) => setMyPasses(PASS_FILTERS.filter((p) => passes.includes(p))), []);

  const distanceTo = useCallback((point: LatLon) => (origin ? distanceMiles(origin, point) : null), [origin]);
  const requireRegion = useCallback((r: RegionId) => setRequested((prev) => (prev.includes(r) ? prev : [...prev, r])), []);
  const regionState = useCallback((r: RegionId): ForecastState => states[r] ?? "loading", [states]);

  const value = useMemo<AppState>(
    () => ({
      forecasts,
      forecastState: regionState(region),
      regionState,
      region,
      setRegion,
      requireRegion,
      origin,
      setOrigin,
      distanceTo,
      favoriteIds,
      toggleFavorite,
      myPasses,
      togglePass,
      setPasses,
      savedListsReady: storageLoaded,
      sortKey,
      setSortKey,
    }),
    [
      forecasts,
      regionState,
      region,
      requireRegion,
      origin,
      distanceTo,
      favoriteIds,
      toggleFavorite,
      myPasses,
      togglePass,
      setPasses,
      storageLoaded,
      sortKey,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      <CountUpContext.Provider value={countingUp}>{children}</CountUpContext.Provider>
    </AppStateContext.Provider>
  );
}

/**
 * Whether a resort matches the pass filter: it takes one of the chosen passes, or it's on no pass
 * and "Independent" is chosen. With nothing chosen, every resort counts.
 */
export function onMyPasses(passes: readonly Pass[], myPasses: PassFilter[]): boolean {
  if (myPasses.length === 0) return true;
  if (passes.length === 0) return myPasses.includes(INDEPENDENT);
  return passes.some((p) => myPasses.includes(p));
}
