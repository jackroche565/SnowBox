"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CountUpContext } from "@/components/CountUp";
import type { SortKey } from "@/components/SortControl";
import type { ForecastResponse, ResortForecast } from "@/lib/forecast";
import { distanceMiles, type LatLon } from "@/lib/geo";
import { PASSES, type Pass } from "@/lib/resorts";

export type Origin = LatLon & { label: string };
export type ForecastState = "loading" | "error" | "ready";

export const COMPARE_LIMIT = 3;
const COUNT_UP_WINDOW_MS = 1500;

// Storage keys predate the Snowbox name. Renaming them would drop everyone's saved lists.
const STORAGE = {
  compare: "snowline:compare",
  favorites: "snowline:favorites",
  passes: "snowline:passes",
  origin: "snowline:origin",
};

type AppState = {
  forecasts: Record<string, ResortForecast> | null;
  forecastState: ForecastState;

  /** Where the user starts from, saved in this browser. */
  origin: Origin | null;
  setOrigin: (origin: Origin | null) => void;
  distanceTo: (point: LatLon) => number | null;

  /** Resorts picked for a head-to-head in Decide. */
  compareIds: string[];
  toggleCompare: (id: string) => void;

  /** Starred resorts, in the order they were starred. Shown on Home. */
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;

  /** Passes the user holds. Empty means "show every resort". */
  myPasses: Pass[];
  togglePass: (pass: Pass) => void;

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
  const [forecastState, setForecastState] = useState<ForecastState>("loading");
  const [countingUp, setCountingUp] = useState(false);

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [myPasses, setMyPasses] = useState<Pass[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("next7");

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

  // Saved settings are read after mount so the server-rendered HTML (which can't see
  // localStorage) matches the first client render.
  useEffect(() => {
    queueMicrotask(() => {
      setCompareIds(readStoredIds(STORAGE.compare).slice(0, COMPARE_LIMIT));
      setFavoriteIds(readStoredIds(STORAGE.favorites));
      setMyPasses(readStoredIds(STORAGE.passes).filter((p): p is Pass => (PASSES as readonly string[]).includes(p)));
      setOrigin(readStoredOrigin());
      setStorageLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    writeStored(STORAGE.compare, compareIds);
    writeStored(STORAGE.favorites, favoriteIds);
    writeStored(STORAGE.passes, myPasses);
    writeStored(STORAGE.origin, origin);
  }, [compareIds, favoriteIds, myPasses, origin, storageLoaded]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < COMPARE_LIMIT ? [...prev, id] : prev,
    );
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const togglePass = useCallback((pass: Pass) => {
    setMyPasses((prev) => (prev.includes(pass) ? prev.filter((p) => p !== pass) : PASSES.filter((p) => p === pass || prev.includes(p))));
  }, []);

  const distanceTo = useCallback((point: LatLon) => (origin ? distanceMiles(origin, point) : null), [origin]);

  const value = useMemo<AppState>(
    () => ({
      forecasts,
      forecastState,
      origin,
      setOrigin,
      distanceTo,
      compareIds,
      toggleCompare,
      favoriteIds,
      toggleFavorite,
      myPasses,
      togglePass,
      savedListsReady: storageLoaded,
      sortKey,
      setSortKey,
    }),
    [
      forecasts,
      forecastState,
      origin,
      distanceTo,
      compareIds,
      toggleCompare,
      favoriteIds,
      toggleFavorite,
      myPasses,
      togglePass,
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

/** Whether a resort takes any of the user's passes. With no passes chosen, every resort counts. */
export function onMyPasses(passes: readonly Pass[], myPasses: Pass[]): boolean {
  return myPasses.length === 0 || passes.some((p) => myPasses.includes(p));
}
