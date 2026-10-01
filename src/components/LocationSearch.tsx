"use client";

import { useState, type FormEvent } from "react";
import type { GeocodeResult } from "@/app/api/geocode/route";
import { useAppState, type Origin } from "@/components/AppState";

type Props = {
  onLocated?: (origin: Origin) => void;
  /** Open on the search form even when a starting point is already saved. */
  startEditing?: boolean;
  className?: string;
};

/** Set where you're starting from. Once set it collapses to a one-line summary with a Change button. */
export default function LocationSearch({ onLocated, startEditing = false, className = "" }: Props) {
  const { origin, setOrigin } = useAppState();
  const [editing, setEditing] = useState(startEditing);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function located(next: Origin) {
    setOrigin(next);
    setEditing(false);
    setQuery("");
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
        located({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Your location" });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Type a city or zip instead.");
      },
    );
  }

  if (origin && !editing) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className="min-w-0 truncate">
          From <span className="font-semibold">{origin.label}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 font-medium text-glacier hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <label htmlFor="location" className="sr-only">
          City or zip code
        </label>
        <input
          id="location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City or zip"
          className="min-w-0 flex-1 basis-40 rounded-[10px] bg-chip px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-glacier focus:outline-none"
        />
        <button
          type="submit"
          disabled={locating}
          className="rounded-[10px] bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
        >
          {locating ? "Finding…" : "Set"}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="rounded-[10px] bg-chip px-3 py-2 text-sm font-medium text-ink hover:bg-line disabled:opacity-60"
        >
          Use my location
        </button>
        {origin && (
          <button type="button" onClick={() => setEditing(false)} className="px-1 text-sm text-ink-muted hover:text-ink">
            Cancel
          </button>
        )}
      </form>
      {error && (
        <p aria-live="polite" className="mt-1.5 text-sm text-barn">
          {error}
        </p>
      )}
    </div>
  );
}
