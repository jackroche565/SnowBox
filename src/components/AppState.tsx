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

type AppState = {
  forecasts: Record<string, ResortForecast> | null;
  forecastState: ForecastState;

  origin: Origin | null;
  setOrigin: (origin: Origin | null) => void;
  distanceTo: (point: LatLon) => number | null;

  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

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

function readStoredCompare(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, COMPARE_LIMIT) : [];
  } catch {
    return [];
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [forecasts, setForecasts] = useState<Record<string, ResortForecast> | null>(null);
  const [forecastState, setForecastState] = useState<ForecastState>("loading");
  const [countingUp, setCountingUp] = useState(false);

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareLoaded, setCompareLoaded] = useState(false);
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

  // The compare tray is remembered in this browser. It's read after mount so the
  // server-rendered HTML (which can't see localStorage) matches the first client render.
  useEffect(() => {
    queueMicrotask(() => {
      setCompareIds(readStoredCompare());
      setCompareLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!compareLoaded) return;
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the tray still works for this visit.
    }
  }, [compareIds, compareLoaded]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < COMPARE_LIMIT ? [...prev, id] : prev,
    );
  }, []);
  const clearCompare = useCallback(() => setCompareIds([]), []);

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
      passFilter,
      setPassFilter,
      sortKey,
      setSortKey,
    }),
    [forecasts, forecastState, origin, distanceTo, compareIds, toggleCompare, clearCompare, passFilter, sortKey],
  );

  return (
    <AppStateContext.Provider value={value}>
      <CountUpContext.Provider value={countingUp}>{children}</CountUpContext.Provider>
    </AppStateContext.Provider>
  );
}
