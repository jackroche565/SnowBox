import type { FormEvent } from "react";
import Ridgeline from "@/components/Ridgeline";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onUseMyLocation: () => void;
  locating: boolean;
  status: { kind: "error" | "info"; text: string } | null;
};

export default function Hero({ query, onQueryChange, onSearch, onUseMyLocation, locating, status }: Props) {
  return (
    <header className="relative overflow-hidden bg-navy text-snow">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-32 sm:pt-12 sm:pb-44">
        <p className="text-xs font-semibold tracking-[0.2em] text-glacier uppercase">VT · NH · ME · NY</p>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide sm:text-7xl">Northeast Snow Report</h1>
        <p className="mt-2 max-w-xl text-sm text-snow/70 sm:text-base">
          Recent snowfall and 7-day forecasts for ski resorts across the Northeast.
        </p>

        <form onSubmit={onSearch} className="mt-6 flex max-w-2xl flex-wrap gap-2">
          <label htmlFor="location" className="sr-only">City or zip code</label>
          <input
            id="location"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
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
            onClick={onUseMyLocation}
            disabled={locating}
            className="rounded-md border border-snow/30 px-4 py-2.5 text-sm font-medium text-snow hover:border-snow/60 hover:bg-white/5 disabled:opacity-60"
          >
            Use my location
          </button>
        </form>
        <p
          aria-live="polite"
          className={`mt-2 min-h-5 text-sm ${status?.kind === "error" ? "text-[#ff9b85]" : "text-snow/70"}`}
        >
          {status?.text}
        </p>
      </div>
      <Ridgeline />
    </header>
  );
}
