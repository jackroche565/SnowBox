"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { onMyPasses, useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import { SnowflakeIcon, StarIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import SnowStake from "@/components/SnowStake";
import { bestThisWeek, formatDrive } from "@/lib/decide";
import type { ResortForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatShortDate, formatTemp } from "@/lib/format";
import { POWDER_INCHES, snowNote } from "@/lib/outlook";
import { getResort, resortPath, resorts, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

const NOTE_TONE = {
  powder: "font-semibold text-alpenglow",
  snow: "text-glacier",
  none: "text-ink-faint",
};

/** The Green Mountains in 3D relief, fading into the page. */
function TerrainBand() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[250px] overflow-hidden sm:h-[300px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static decorative render */}
      <img src="/terrain/green-mountains.jpg" alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgb(243 245 248 / 0) 55%, var(--snow) 100%)" }} />
    </div>
  );
}

type Status = { text: ReactNode; tone: "powder" | "snow" };

/** One fact for the top of the page: the next powder day, or the next snow, across your mountains. */
function statusFor(list: Resort[], forecasts: Record<string, ResortForecast>): Status | null {
  let powder: { resort: Resort; date: string; index: number; inches: number } | null = null;
  let next: { date: string; index: number } | null = null;
  let anyRecent = false;

  for (const resort of list) {
    const f = forecasts[resort.id];
    if (!f) continue;
    if (f.past7In >= 0.5) anyRecent = true;
    for (let i = 0; i < f.upcoming.length; i++) {
      const inches = f.upcoming[i].snowIn ?? 0;
      const sooner = !powder || i < powder.index || (i === powder.index && inches > powder.inches);
      if (inches >= POWDER_INCHES && sooner) powder = { resort, date: f.upcoming[i].date, index: i, inches };
    }
    const n = f.outlook.findIndex((d) => (d.snowIn ?? 0) >= 0.5);
    if (n !== -1 && (!next || n < next.index)) next = { date: f.outlook[n].date, index: n };
  }

  if (powder) {
    return {
      tone: "powder",
      text: (
        <>
          Powder {formatDay(powder.date, powder.index)} at <span className="font-semibold">{powder.resort.name}</span> ·{" "}
          {formatInches(powder.inches)}
        </>
      ),
    };
  }
  if (!next) return null;
  return {
    tone: "snow",
    text: (
      <>
        {anyRecent ? "Next snow" : "First snow in the forecast"}{" "}
        <span className="font-semibold">{next.index < 7 ? formatDay(next.date, next.index) : formatShortDate(next.date)}</span>
      </>
    ),
  };
}

function MountainRow({ resort, forecast }: { resort: Resort; forecast: ResortForecast | undefined }) {
  const note = forecast && snowNote(forecast);
  const snow = forecast?.next7In ?? 0;
  return (
    <li className="border-t border-hairline">
      <Link href={resortPath(resort.id)} className="flex items-center gap-3.5 px-[18px] py-[11px] hover:bg-snow/60">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="type-name truncate text-[19px] leading-tight tracking-[-0.005em]">{resort.name}</span>
            <PassTags passes={resort.passes} />
          </span>
          <span className="mt-0.5 block truncate text-[13px] tabular-nums">
            {note ? <span className={NOTE_TONE[note.tone]}>{note.text}</span> : <span className="text-ink-faint">Loading…</span>}
            {forecast && (
              <span className="text-ink-faint">
                {" · "}
                <CountUp value={forecast.tempF} format={formatTemp} />
              </span>
            )}
          </span>
        </span>
        {forecast && (
          <span className="flex items-end gap-2">
            <SnowStake inches={snow} height={34} />
            <span className="w-[58px] text-right">
              <span className={`type-figure block text-[26px] ${snow >= 0.1 ? "text-ink" : "text-ink-zero"}`}>
                {formatInches(snow)}
              </span>
              <span className="mt-[3px] block text-[11px] text-ink-faint">7 days</span>
            </span>
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
    <Link href="/decide" className="group flex items-baseline justify-between gap-3 px-2 text-sm">
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
  const status = forecasts && favorites.length > 0 ? statusFor(favorites, forecasts) : null;
  // The forecast's own "today" (resort time), so the server and browser never disagree on the date.
  const today = forecasts ? Object.values(forecasts)[0]?.outlook[0]?.date : undefined;

  return (
    <div className="relative flex flex-1 flex-col">
      <TerrainBand />
      <SiteHeader variant="overlay" aside={today ? formatShortDate(today) : undefined} />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-3 pt-[176px] pb-10 sm:pt-[220px]">
        <h1 className="sr-only">Your mountains</h1>

        <div className="flex min-h-[34px] items-center px-2">
          {status && (
            <p className="flex items-center gap-2 rounded-full bg-white/88 py-[7px] pr-3 pl-2.5 text-[13px] shadow-[0_1px_2px_rgb(15_26_42/0.06)] backdrop-blur-sm">
              <SnowflakeIcon className={`h-3.5 w-3.5 ${status.tone === "powder" ? "text-alpenglow" : "text-glacier"}`} />
              <span>{status.text}</span>
            </p>
          )}
        </div>

        {/* Starring keeps the picker open (so a first visit can pick several) until Done. */}
        {picking && <MountainPicker onToggle={() => setEditing(true)} onDone={() => setEditing(false)} />}

        {savedListsReady && favorites.length > 0 && !editing && (
          <>
            <section aria-labelledby="your-mountains" className="sheet overflow-hidden">
              <div className="flex items-baseline justify-between px-[18px] pt-4 pb-1.5">
                <h2 id="your-mountains" className="text-[15px] font-semibold">
                  Your mountains
                </h2>
                <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-glacier hover:underline">
                  Edit
                </button>
              </div>
              <ul>
                {sorted.map((r) => (
                  <MountainRow key={r.id} resort={r} forecast={forecasts?.[r.id]} />
                ))}
                <li className="border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="w-full px-[18px] pt-[13px] pb-[15px] text-left text-sm font-medium text-glacier hover:bg-snow/60"
                  >
                    + Add mountain
                  </button>
                </li>
              </ul>
            </section>
            {forecastState === "error" && (
              <p className="px-2 text-sm text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>
            )}
            {forecasts && <BestBet forecasts={forecasts} />}
          </>
        )}
      </main>

      <footer className="mx-auto w-full max-w-2xl px-5 pb-8 text-xs text-ink-faint">
        Forecasts from{" "}
        <a className="underline" href="https://open-meteo.com/">
          Open-Meteo
        </a>
        , refreshed every 30 minutes. Snow totals are modeled, not resort-reported.
      </footer>
    </div>
  );
}
