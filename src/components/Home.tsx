"use client";

import Link from "next/link";
import { useState } from "react";
import { onMyPasses, useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import { StarIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import { bestThisWeek, formatDrive } from "@/lib/decide";
import type { ResortForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatTemp } from "@/lib/format";
import { snowNote } from "@/lib/outlook";
import { getResort, resortPath, resorts, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

const NOTE_TONE = {
  powder: "font-semibold text-alpenglow",
  snow: "font-medium text-glacier",
  none: "text-ink-muted",
};

function MountainRow({ resort, forecast }: { resort: Resort; forecast: ResortForecast | undefined }) {
  const note = forecast && snowNote(forecast);
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={resortPath(resort.id)} className="flex items-center gap-4 px-4 py-3.5 hover:bg-glacier/[.05]">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{resort.name}</span>
            <PassTags passes={resort.passes} />
          </span>
          <span className="mt-0.5 block truncate text-xs tabular-nums">
            {note ? <span className={NOTE_TONE[note.tone]}>{note.text}</span> : <span className="text-ink-muted">Loading…</span>}
            {forecast && (
              <span className="text-ink-muted">
                {" · "}
                <CountUp value={forecast.tempF} format={formatTemp} />
              </span>
            )}
          </span>
        </span>
        {forecast && (
          <span className="shrink-0 text-right tabular-nums">
            <span className="block text-2xl font-semibold">{formatInches(forecast.next7In)}</span>
            <span className="block text-[10px] tracking-wide text-ink-muted uppercase">Next 7 days</span>
          </span>
        )}
      </Link>
    </li>
  );
}

const NEARBY_COUNT = 8;

/** Matches a resort by name or state ("stowe", "vt", "vermont"). */
function matches(resort: Resort, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    resort.name.toLowerCase().includes(q) ||
    resort.state.toLowerCase() === q ||
    (US_STATES[resort.state] ?? "").toLowerCase().startsWith(q)
  );
}

function StarChip({ resort, onToggle }: { resort: Resort; onToggle?: () => void }) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const on = favoriteIds.includes(resort.id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        toggleFavorite(resort.id);
        onToggle?.();
      }}
      className={`flex items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-2.5 text-sm transition-colors ${
        on ? "border-navy bg-navy text-snow" : "border-line bg-snow text-ink hover:border-ink/30"
      }`}
    >
      <StarIcon filled={on} className={`h-4 w-4 ${on ? "text-gold" : "text-ink-muted"}`} />
      {resort.name}
    </button>
  );
}

function ChipGroup({ label, list, onToggle }: { label: string; list: Resort[]; onToggle: () => void }) {
  if (list.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{label}</div>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {list.map((r) => (
          <li key={r.id}>
            <StarChip resort={r} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATE_ORDER = [...new Set(resorts.map((r) => r.state))];

function MountainPicker({ onToggle, onDone }: { onToggle: () => void; onDone: () => void }) {
  const { favoriteIds, origin, distanceTo } = useAppState();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("All");

  const shown = resorts.filter((r) => (state === "All" || r.state === state) && matches(r, query));
  const nearby =
    origin && !query && state === "All"
      ? [...resorts].sort((a, b) => (distanceTo(a) ?? 0) - (distanceTo(b) ?? 0)).slice(0, NEARBY_COUNT)
      : [];

  return (
    <section aria-label="Choose your mountains" className="rounded-lg border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Star the mountains you ski.</p>
        {favoriteIds.length > 0 && (
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 rounded-md bg-navy px-4 py-1.5 text-sm font-semibold text-snow hover:bg-navy-2"
          >
            Done · {favoriteIds.length}
          </button>
        )}
      </div>

      <label htmlFor="mountain-search" className="sr-only">
        Search mountains
      </label>
      <input
        id="mountain-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${resorts.length} mountains`}
        className="mt-3 w-full rounded-md border border-line bg-snow px-3 py-2 text-sm placeholder:text-ink-muted focus:ring-2 focus:ring-glacier focus:outline-none"
      />
      <div role="radiogroup" aria-label="State" className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1">
        {["All", ...STATE_ORDER].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={state === s}
            onClick={() => setState(s)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              state === s ? "bg-navy text-snow" : "text-ink-muted hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {origin && <ChipGroup label={`Near ${origin.label}`} list={nearby} onToggle={onToggle} />}
        {STATE_ORDER.map((st) => (
          <ChipGroup
            key={st}
            label={US_STATES[st] ?? st}
            list={shown.filter((r) => r.state === st)}
            onToggle={onToggle}
          />
        ))}
        {shown.length === 0 && <p className="text-sm text-ink-muted">No mountains match “{query}”.</p>}
      </div>
    </section>
  );
}

function BestBet({ forecasts }: { forecasts: Record<string, ResortForecast> }) {
  const { myPasses, origin } = useAppState();
  const best = bestThisWeek(
    resorts.filter((r) => onMyPasses(r.passes, myPasses)),
    forecasts,
    origin,
  );

  if (!best) return null;

  const { pick, dayIndex } = best;
  return (
    <Link href="/decide" className="group flex items-baseline justify-between gap-3 px-1 text-sm">
      <span className="min-w-0 truncate">
        <span className="text-ink-muted">Best bet this week: </span>
        <span className="font-semibold">{pick.resort.name}</span>
        <span className="text-ink-muted tabular-nums">
          {" "}
          · {formatInches(pick.snowIn)} {formatDay(pick.day.date, dayIndex)}
          {pick.driveHours != null && ` · ${formatDrive(pick.driveHours)} drive`}
        </span>
      </span>
      <span className="shrink-0 font-medium text-glacier group-hover:underline">Decide →</span>
    </Link>
  );
}

export default function Home() {
  const { forecasts, forecastState, favoriteIds, savedListsReady } = useAppState();
  const [editing, setEditing] = useState(false);

  const favorites = favoriteIds.flatMap((id) => getResort(id) ?? []);
  // Most snow coming first; starring order breaks ties.
  const sorted = forecasts
    ? [...favorites].sort((a, b) => (forecasts[b.id]?.next7In ?? 0) - (forecasts[a.id]?.next7In ?? 0))
    : favorites;
  const picking = savedListsReady && (favorites.length === 0 || editing);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-4 pb-10">
        <h1 className="sr-only">My mountains</h1>

        {/* Starring keeps the picker open (so a first visit can pick several) until Done. */}
        {picking && <MountainPicker onToggle={() => setEditing(true)} onDone={() => setEditing(false)} />}

        {savedListsReady && favorites.length > 0 && !editing && (
          <>
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">My mountains</h2>
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-glacier hover:underline">
                Edit
              </button>
            </div>

            <ul className="overflow-hidden rounded-lg border border-line bg-white">
              {sorted.map((r) => (
                <MountainRow key={r.id} resort={r} forecast={forecasts?.[r.id]} />
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-glacier hover:bg-glacier/[.05]"
                >
                  + Add mountain
                </button>
              </li>
            </ul>
            {forecastState === "error" && (
              <p className="text-sm text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>
            )}

            {forecasts && <BestBet forecasts={forecasts} />}
          </>
        )}
      </main>

      <footer className="mx-auto w-full max-w-4xl px-4 pb-8 text-xs text-ink-muted">
        Forecasts from{" "}
        <a className="underline" href="https://open-meteo.com/">
          Open-Meteo
        </a>
        , refreshed every 30 minutes. Snow totals are modeled, not resort-reported.
      </footer>
    </>
  );
}
