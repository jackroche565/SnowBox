"use client";

import { useState, type FormEvent } from "react";
import type { GeocodeResult } from "@/app/api/geocode/route";
import { useAppState, type Origin } from "@/components/AppState";

export default function LocationSearch({ onLocated }: { onLocated?: (origin: Origin) => void }) {
  const { origin, setOrigin } = useAppState();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function located(next: Origin) {
    setOrigin(next);
    onLocated?.(next);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLocating(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Location lookup failed");
      const result = data as GeocodeResult;
      located({ lat: result.lat, lon: result.lon, label: result.label });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location lookup failed");
    } finally {
      setLocating(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        located({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Try typing a city or zip instead.");
      },
    );
  }

  return (
    <div className="mt-6 max-w-2xl">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <label htmlFor="location" className="sr-only">City or zip code</label>
        <input
          id="location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City or zip, e.g. Boston, MA or 05672"
          className="w-full min-w-0 rounded-md bg-snow px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-glacier focus:outline-none sm:w-auto sm:flex-1"
        />
        <button
          type="submit"
          disabled={locating}
          className="rounded-md bg-alpenglow px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {locating ? "Finding…" : "Search"}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="rounded-md border border-snow/30 px-4 py-2.5 text-sm font-medium text-snow hover:border-snow/60 hover:bg-white/5 disabled:opacity-60"
        >
          Use my location
        </button>
      </form>
      <p aria-live="polite" className={`mt-2 min-h-5 text-sm ${error ? "text-[#ff9b85]" : "text-snow/70"}`}>
        {error ?? (origin ? `Showing resorts near ${origin.label}.` : null)}
      </p>
    </div>
  );
}
