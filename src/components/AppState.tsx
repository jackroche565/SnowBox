"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CountUpContext } from "@/components/CountUp";
import type { SortKey } from "@/components/SortControl";
import type { ForecastResponse, ResortForecast } from "@/lib/forecast";
import { distanceMiles, type LatLon } from "@/lib/geo";
import type { Pass } from "@/lib/resorts";

export type Origin = LatLon & { label: string };
export type PassFilter = Pass | "All";
export type ForecastState = "loading" | "error" | "ready";

export const COMPARE_LIMIT = 3;
const COUNT_UP_WINDOW_MS = 1500;
const COMPARE_STORAGE_KEY = "snowline:compare";
const FAVORITES_STORAGE_KEY = "snowline:favorites";

type AppState = {
  forecasts: Record<string, ResortForecast> | null;
  forecastState: ForecastState;

  origin: Origin | null;
  setOrigin: (origin: Origin | null) => void;
  distanceTo: (point: LatLon) => number | null;

  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  /** Starred resorts, in the order they were starred. Shown first on Home. */
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  /** False until saved lists are read from this browser, so pages can avoid flashing an empty state. */
  savedListsReady: boolean;

  // Overview settings live here so they survive a trip to a detail page and back.
  passFilter: PassFilter;
  setPassFilter: (filter: PassFilter) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
};

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used inside <AppStateProvider>");
  return state;
}

function readStoredIds(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the list still works for this visit.
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [forecasts, setForecasts] = useState<Record<string, ResortForecast> | null>(null);
  const [forecastState, setForecastState] = useState<ForecastState>("loading");
  const [countingUp, setCountingUp] = useState(false);

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [passFilter, setPassFilter] = useState<PassFilter>("All");
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

  // Compare and favorites are remembered in this browser. They're read after mount so the
  // server-rendered HTML (which can't see localStorage) matches the first client render.
  useEffect(() => {
    queueMicrotask(() => {
      setCompareIds(readStoredIds(COMPARE_STORAGE_KEY).slice(0, COMPARE_LIMIT));
      setFavoriteIds(readStoredIds(FAVORITES_STORAGE_KEY));
      setStorageLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (storageLoaded) writeStoredIds(COMPARE_STORAGE_KEY, compareIds);
  }, [compareIds, storageLoaded]);

  useEffect(() => {
    if (storageLoaded) writeStoredIds(FAVORITES_STORAGE_KEY, favoriteIds);
  }, [favoriteIds, storageLoaded]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < COMPARE_LIMIT ? [...prev, id] : prev,
    );
  }, []);
  const clearCompare = useCallback(() => setCompareIds([]), []);
  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
      clearCompare,
      favoriteIds,
      toggleFavorite,
      savedListsReady: storageLoaded,
      passFilter,
      setPassFilter,
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
      clearCompare,
      favoriteIds,
      toggleFavorite,
      storageLoaded,
      passFilter,
      sortKey,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      <CountUpContext.Provider value={countingUp}>{children}</CountUpContext.Provider>
    </AppStateContext.Provider>
  );
}
