"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { StarIcon } from "@/components/Icons";
import SiteHeader from "@/components/SiteHeader";
import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatShortDate, resortColor } from "@/lib/format";
import { getResort, resortPath, resorts, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

/**
 * The Mount Mansfield range in 3D relief. The render's sky is the page color, so the ridgeline rises
 * straight out of the page; the foot fades into it too.
 */
function TerrainBand() {
  return (
    <div aria-hidden="true" className="relative h-[120px] overflow-hidden sm:h-[200px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static decorative render */}
      <img src="/terrain/green-mountains.jpg" alt="" className="h-full w-full object-cover object-[50%_30%]" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgb(243 245 248 / 0) 55%, var(--snow) 100%)" }} />
    </div>
  );
}

// ── The headline: one number ──────────────────────────────────────────

/** The one thing worth knowing first: who gets the most snow this week, or when the next snow is. */
function Headline({ list, forecasts }: { list: Resort[]; forecasts: Record<string, ResortForecast> }) {
  let best: { resort: Resort; total: number; day: DailyForecast; index: number } | null = null;
  let next: { resort: Resort; day: DailyForecast; index: number } | null = null;
  for (const resort of list) {
    const f = forecasts[resort.id];
    if (!f) continue;
    if (f.next7In >= 0.5 && (!best || f.next7In > best.total)) {
      const index = f.upcoming.reduce((m, d, i, all) => ((d.snowIn ?? 0) > (all[m].snowIn ?? 0) ? i : m), 0);
      best = { resort, total: f.next7In, day: f.upcoming[index], index };
    }
    const n = f.outlook.findIndex((d) => (d.snowIn ?? 0) >= 0.5);
    if (n !== -1 && (!next || n < next.index)) next = { resort, day: f.outlook[n], index: n };
  }

  const figure = best ? formatInches(best.total) : next ? formatInches(next.day.snowIn) : null;
  if (!figure) return <p className="px-5 text-[13px] text-ink-muted">No snow in the forecast for your mountains.</p>;
  return (
    <div className="px-5">
      <p className="text-[13px] text-ink-muted">{best ? "Most snow this week" : "Next snow"}</p>
      <p className="mt-0.5 flex items-baseline gap-2.5">
        <span className="type-hero text-[56px] leading-[0.9] tabular-nums">{figure}</span>
        <span className="text-[15px]">
          <span className="font-semibold">{(best ?? next)!.resort.name}</span>
          <span className="text-ink-muted">
            {best
              ? ` · ${formatInches(best.day.snowIn)} on ${formatDay(best.day.date, best.index)}`
              : ` · ${next!.index < 7 ? formatDay(next!.day.date, next!.index) : formatShortDate(next!.day.date)}`}
          </span>
        </span>
      </p>
    </div>
  );
}

// ── Your week: mountains × days ───────────────────────────────────────

/** Deeper blue for more snow. Under half an inch reads as nothing. */
function cellStyle(inches: number): { bg: string; fg: string } {
  if (inches < 0.5) return { bg: "transparent", fg: "#c3cad4" };
  if (inches < 2.5) return { bg: "#e6f0f7", fg: "#0f1a2a" };
  if (inches < 5.5) return { bg: "#9fcbe6", fg: "#0f1a2a" };
  if (inches < 9.5) return { bg: "#2f76a3", fg: "#ffffff" };
  return { bg: "#1b4e75", fg: "#ffffff" };
}

const GRID = "grid grid-cols-[100px_repeat(7,minmax(0,1fr))_42px] items-center gap-1";

function WeekRow({ resort, forecast }: { resort: Resort; forecast: ResortForecast | undefined }) {
  return (
    <li className="border-t border-hairline">
      <Link href={resortPath(resort.id)} className={`${GRID} px-1 py-[5px] hover:bg-snow/70`}>
        <span className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: resortColor(resort.passes) }} />
          <span className="type-name truncate text-[15px]">{resort.name}</span>
        </span>
        {forecast
          ? forecast.upcoming.map((d) => {
              const inches = d.snowIn ?? 0;
              const { bg, fg } = cellStyle(inches);
              return (
                <span
                  key={d.date}
                  className="type-figure flex h-[30px] items-center justify-center rounded-[7px] text-[13px]"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {inches < 0.5 ? "·" : Math.round(inches)}
                </span>
              );
            })
          : Array.from({ length: 7 }, (_, i) => <span key={i} className="h-[30px] rounded-[7px] bg-snow" />)}
        <span className={`type-figure text-right text-[17px] font-bold ${forecast && forecast.next7In >= 0.5 ? "" : "text-ink-zero"}`}>
          {forecast ? formatInches(forecast.next7In) : ""}
        </span>
      </Link>
    </li>
  );
}

function YourWeek({ list, forecasts, onEdit }: { list: Resort[]; forecasts: Record<string, ResortForecast> | null; onEdit: () => void }) {
  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  return (
    <section aria-labelledby="your-week" className="sheet px-3 pt-3.5 pb-2">
      <div className="flex items-baseline justify-between px-1 pb-2.5">
        <h2 id="your-week" className="text-[15px] font-semibold">
          Your week
        </h2>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-glacier hover:underline">
          Edit
        </button>
      </div>
      <div aria-hidden="true" className={`${GRID} px-1 pb-1.5 text-center text-[11px] text-ink-faint tabular-nums`}>
        <span />
        {days.map((d) => (
          <span key={d.date}>
            <span className="block font-semibold">{formatDay(d.date, -1).slice(0, 2)}</span>
            {Number(d.date.slice(8))}
          </span>
        ))}
        <span className="text-right">Total</span>
      </div>
      <ul>
        {list.map((r) => (
          <WeekRow key={r.id} resort={r} forecast={forecasts?.[r.id]} />
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-hairline px-1 pt-2.5 pb-1 text-[11px] text-ink-faint">
        <span>Snow per day, inches</span>
        {[
          ["1–2", "#e6f0f7"],
          ["3–5", "#9fcbe6"],
          ["6–9", "#2f76a3"],
          ["10+", "#1b4e75"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </p>
    </section>
  );
}

// ── Choosing your mountains ───────────────────────────────────────────

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
      className={`flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-sm transition-colors ${
        on ? "bg-ink text-snow" : "bg-chip text-ink hover:bg-line"
      }`}
    >
      <StarIcon filled={on} className={`h-4 w-4 ${on ? "text-gold" : "text-ink-faint"}`} />
      {resort.name}
    </button>
  );
}

function ChipGroup({ label, list, onToggle }: { label: string; list: Resort[]; onToggle: () => void }) {
  if (list.length === 0) return null;
  return (
    <div>
      <div className="text-[13px] font-semibold text-ink-muted">{label}</div>
      <ul className="mt-2 flex flex-wrap gap-2">
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
    <section aria-label="Choose your mountains" className="sheet p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Star the mountains you ski</h2>
        {favoriteIds.length > 0 && (
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-snow hover:bg-navy-2"
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
        className="mt-3 h-11 w-full rounded-xl bg-chip px-3.5 text-[15px] placeholder:text-ink-faint focus:ring-2 focus:ring-glacier focus:outline-none"
      />
      <div role="radiogroup" aria-label="State" className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1">
        {["All", ...STATE_ORDER].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={state === s}
            onClick={() => setState(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
              state === s ? "bg-ink text-snow" : "text-ink-faint hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-5">
        {origin && <ChipGroup label={`Near ${origin.label}`} list={nearby} onToggle={onToggle} />}
        {STATE_ORDER.map((st) => (
          <ChipGroup key={st} label={US_STATES[st] ?? st} list={shown.filter((r) => r.state === st)} onToggle={onToggle} />
        ))}
        {shown.length === 0 && <p className="text-sm text-ink-muted">No mountains match “{query}”.</p>}
      </div>
    </section>
  );
}

export default function Home() {
  const { forecasts, forecastState, favoriteIds, savedListsReady } = useAppState();
  const [editing, setEditing] = useState(false);

  const favorites = favoriteIds.flatMap((id) => getResort(id) ?? []);
  // Most snow this week first; starring order breaks ties.
  const sorted = forecasts
    ? [...favorites].sort((a, b) => (forecasts[b.id]?.next7In ?? 0) - (forecasts[a.id]?.next7In ?? 0))
    : favorites;
  const picking = savedListsReady && (favorites.length === 0 || editing);
  // The forecast's own "today" (resort time), so the server and browser never disagree on the date.
  const today = forecasts ? Object.values(forecasts)[0]?.outlook[0]?.date : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader aside={today ? formatShortDate(today) : undefined} />
      <h1 className="sr-only">Your mountains</h1>
      <TerrainBand />

      <main className="relative mx-auto -mt-5 flex w-full max-w-2xl flex-1 flex-col gap-4 pb-10">
        {/* Starring keeps the picker open (so a first visit can pick several) until Done. */}
        {picking && (
          <div className="px-3">
            <MountainPicker onToggle={() => setEditing(true)} onDone={() => setEditing(false)} />
          </div>
        )}

        {savedListsReady && favorites.length > 0 && !editing && (
          <>
            {forecasts && <Headline list={favorites} forecasts={forecasts} />}
            <div className="px-3">
              <YourWeek list={sorted} forecasts={forecasts} onEdit={() => setEditing(true)} />
            </div>
            {forecastState === "error" && (
              <p className="px-5 text-sm text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>
            )}
          </>
        )}
      </main>

      <footer className="mx-auto w-full max-w-2xl px-5 pb-8 text-xs text-ink-faint">
        Forecasts from{" "}
        <a className="underline" href="https://open-meteo.com/">
          Open-Meteo
        </a>
        . Snow is modeled, not resort-reported.
      </footer>
    </div>
  );
}
