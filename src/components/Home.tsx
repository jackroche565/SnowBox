"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AlertsResponse } from "@/app/api/alerts/route";
import AlertLine from "@/components/AlertLine";
import { useAppState } from "@/components/AppState";
import { StarIcon } from "@/components/Icons";
import LocationSearch from "@/components/LocationSearch";
import PassTags from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import type { NwsAlert } from "@/lib/nws";
import { formatDay, formatInches, formatShortDate } from "@/lib/format";
import { getResort, resortPath, resorts, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

/**
 * The Mount Mansfield range in 3D relief. The render's sky is the page color, so the ridgeline rises
 * straight out of the page; the foot fades into it too.
 */
function TerrainBand() {
  return (
    <div aria-hidden="true" className="relative h-[110px] overflow-hidden sm:h-[180px]">
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
  if (!figure) return <p className="px-4 py-5 text-[15px]">No snow in the forecast for your mountains.</p>;
  const pick = (best ?? next)!;
  return (
    <div className="flex items-end gap-4 px-4 pt-1 pb-5">
      <span className="type-hero text-[104px] text-glacier">{figure}</span>
      <div className="min-w-0 pb-1.5">
        <p className="text-[13px] text-ink-muted">{best ? "Most snow, next 7 days" : "Next snow"}</p>
        <Link href={resortPath(pick.resort.id)} className="type-name mt-0.5 block text-[28px] hover:underline">
          {pick.resort.name}
        </Link>
        <p className="mt-1 text-[14px] text-ink-muted">
          {best
            ? `Biggest day ${formatDay(best.day.date, best.index)}, ${formatInches(best.day.snowIn)}`
            : next!.index < 7
              ? formatDay(next!.day.date, next!.index)
              : formatShortDate(next!.day.date)}
        </p>
      </div>
    </div>
  );
}

// ── Weather service warnings ──────────────────────────────────────────

function useAlerts(): Record<string, NwsAlert[]> | null {
  const [alerts, setAlerts] = useState<Record<string, NwsAlert[]> | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/alerts")
      .then((res) => (res.ok ? (res.json() as Promise<AlertsResponse>) : null))
      .then((data) => !cancelled && data && setAlerts(data.alerts))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return alerts;
}

/** One line per warning across your mountains: "Winter Storm Warning for Stowe and Jay Peak until Thu 7pm." */
function Warnings({ list, alerts }: { list: Resort[]; alerts: Record<string, NwsAlert[]> }) {
  const groups = new Map<string, { alert: NwsAlert; names: string[] }>();
  for (const resort of list) {
    for (const alert of alerts[resort.id] ?? []) {
      const key = `${alert.event}|${alert.until}`;
      const group = groups.get(key) ?? { alert, names: [] };
      group.names.push(resort.name);
      groups.set(key, group);
    }
  }
  if (groups.size === 0) return null;
  const join = (names: string[]) => (names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
  return (
    <ul aria-label="Weather service warnings" className="px-4 pb-4 text-[15px]">
      {[...groups.values()].map(({ alert, names }) => (
        <li key={`${alert.event}|${alert.until}`}>
          <AlertLine alert={alert} where={join(names)} />
        </li>
      ))}
    </ul>
  );
}

// ── Your week: mountains × days ───────────────────────────────────────

/** Bars rise from 16 to 36px and stop growing at this many inches. */
const BAR_CAP_INCHES = 10;
/** Under half an inch reads as nothing. */
const MEASURABLE = 0.5;

function barStyle(inches: number): { height: number; bg: string; fg: string } {
  const height = 16 + (Math.min(inches, BAR_CAP_INCHES) / BAR_CAP_INCHES) * 20;
  if (inches < 2.5) return { height, bg: "var(--snow-light)", fg: "var(--ink)" };
  if (inches < 5.5) return { height, bg: "var(--snow-mid)", fg: "var(--ink)" };
  if (inches < 9.5) return { height, bg: "var(--glacier)", fg: "#fff" };
  return { height, bg: "var(--snow-deep)", fg: "#fff" };
}

const GRID = "grid grid-cols-[112px_repeat(7,minmax(0,1fr))_40px] gap-x-[3px]";
/** The biggest day's column gets a faint glacier tint. */
const TINT = "rgb(31 95 139 / 0.07)";

function DayCell({ inches, highlight }: { inches: number; highlight: boolean }) {
  const bar = barStyle(inches);
  return (
    <span className="flex h-full items-end justify-center pb-2.5" style={{ backgroundColor: highlight ? TINT : undefined }}>
      {inches < MEASURABLE ? (
        <span className="h-[2px] w-full max-w-[28px] bg-snow-none" />
      ) : (
        <span
          className="type-figure flex w-full max-w-[34px] items-start justify-center pt-[3px] text-[12px]"
          style={{ height: bar.height, backgroundColor: bar.bg, color: bar.fg }}
        >
          {Math.round(inches)}
        </span>
      )}
    </span>
  );
}

function WeekRow({
  resort,
  forecast,
  highlight,
}: {
  resort: Resort;
  forecast: ResortForecast | undefined;
  highlight: number;
}) {
  const { myPasses } = useAppState();
  return (
    <li className="rule-row">
      <Link href={resortPath(resort.id)} className={`${GRID} min-h-[62px] hover:bg-white/50`}>
        <span className="flex min-w-0 flex-col justify-center gap-1 py-2 pl-4">
          <span className="type-name truncate text-[17px]">{resort.name}</span>
          <PassTags passes={resort.passes} held={myPasses} />
        </span>
        {forecast
          ? forecast.upcoming.map((d, i) => <DayCell key={d.date} inches={d.snowIn ?? 0} highlight={i === highlight} />)
          : Array.from({ length: 7 }, (_, i) => <span key={i} />)}
        <span
          className={`type-figure flex items-end justify-end pr-4 pb-2.5 text-[19px] ${
            forecast && forecast.next7In >= MEASURABLE ? "text-glacier" : "text-ink-zero"
          }`}
        >
          {forecast ? formatInches(forecast.next7In) : ""}
        </span>
      </Link>
    </li>
  );
}

function YourWeek({ list, forecasts, onEdit }: { list: Resort[]; forecasts: Record<string, ResortForecast> | null; onEdit: () => void }) {
  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  // The day with the most snow across your mountains.
  const totals = days.map((_, i) => list.reduce((t, r) => t + (forecasts?.[r.id]?.upcoming[i]?.snowIn ?? 0), 0));
  const top = totals.reduce((m, t, i) => (t > totals[m] ? i : m), 0);
  const highlight = totals[top] >= MEASURABLE ? top : -1;

  return (
    <section aria-labelledby="your-week" className="rule-section">
      <div className="flex items-baseline justify-between px-4 pt-3 pb-2">
        <h2 id="your-week" className="text-[13px] font-semibold">
          Your week
        </h2>
        <button type="button" onClick={onEdit} className="text-[13px] font-semibold underline underline-offset-2">
          Edit
        </button>
      </div>
      <div aria-hidden="true" className={`${GRID} text-center text-[11px] tabular-nums`}>
        <span />
        {days.map((d, i) => (
          <span
            key={d.date}
            className={`pt-1.5 pb-1 ${i === highlight ? "font-semibold text-glacier" : "text-ink-faint"}`}
            style={{ backgroundColor: i === highlight ? TINT : undefined }}
          >
            <span className="block font-semibold">{formatDay(d.date, -1).slice(0, 2)}</span>
            {Number(d.date.slice(8))}
          </span>
        ))}
        <span className="pt-1.5 pr-4 text-right text-ink-faint">Total</span>
      </div>
      <ul>
        {list.map((r) => (
          <WeekRow key={r.id} resort={r} forecast={forecasts?.[r.id]} highlight={highlight} />
        ))}
      </ul>
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6 L15 12 L9 18" />
    </svg>
  );
}

function MountainRow({ resort, onToggle }: { resort: Resort; onToggle: () => void }) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const on = favoriteIds.includes(resort.id);
  return (
    <li className="rule-row">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          toggleFavorite(resort.id);
          onToggle();
        }}
        className="flex w-full items-center justify-between gap-3 py-3 pr-4 pl-8 text-left"
      >
        <span className={`text-[15px] ${on ? "font-semibold" : ""}`}>{resort.name}</span>
        <StarIcon filled={on} className={`h-5 w-5 ${on ? "text-ink" : "text-ink-faint"}`} />
      </button>
    </li>
  );
}

const STATES_BY_COUNT = Object.entries(
  resorts.reduce<Record<string, number>>((counts, r) => ({ ...counts, [r.state]: (counts[r.state] ?? 0) + 1 }), {}),
).sort((a, b) => b[1] - a[1]);

function MountainPicker({ onToggle, onDone }: { onToggle: () => void; onDone: () => void }) {
  const { favoriteIds, origin, distanceTo } = useAppState();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const found = query.trim() ? resorts.filter((r) => matches(r, query)) : null;
  const nearby = origin ? [...resorts].sort((a, b) => (distanceTo(a) ?? 0) - (distanceTo(b) ?? 0)).slice(0, NEARBY_COUNT) : [];

  return (
    <section aria-label="Choose your mountains" className="flex flex-1 flex-col pb-24">
      <h2 className="type-hero px-4 pt-7 text-[44px] leading-[0.95] [font-stretch:65%]">Which mountains do you ski?</h2>

      <div className="px-4 pt-6">
        <label htmlFor="mountain-search" className="sr-only">
          Search mountains
        </label>
        <input
          id="mountain-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${resorts.length} mountains`}
          className="w-full border-b-2 border-ink bg-transparent pb-2 text-[17px] placeholder:text-ink-faint focus:outline-none"
        />
        {!origin && !locating && (
          <button
            type="button"
            onClick={() => setLocating(true)}
            className="mt-3 text-[14px] font-semibold underline underline-offset-2"
          >
            Show what&apos;s closest to me
          </button>
        )}
        {(locating || origin) && (
          <LocationSearch startEditing={!origin} onLocated={() => setLocating(false)} className="mt-3" />
        )}
      </div>

      {found ? (
        <ul className="mt-5">
          {found.map((r) => (
            <MountainRow key={r.id} resort={r} onToggle={onToggle} />
          ))}
          {found.length === 0 && <li className="px-4 py-3 text-[15px] text-ink-muted">No mountains match “{query}”.</li>}
        </ul>
      ) : (
        <>
          {nearby.length > 0 && (
            <div className="mt-5">
              <h3 className="px-4 pb-2 text-[13px] font-semibold">Closest to {origin!.label.split(",")[0]}</h3>
              <ul>
                {nearby.map((r) => (
                  <MountainRow key={r.id} resort={r} onToggle={onToggle} />
                ))}
              </ul>
            </div>
          )}
          <ul className="rule-section mt-5">
            {STATES_BY_COUNT.map(([st, count], i) => {
              const expanded = open === st;
              return (
                <li key={st} className={i > 0 ? "rule-row" : undefined}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : st)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="type-name text-[19px]">{US_STATES[st] ?? st}</span>
                    <span className="flex items-center gap-2 text-[13px] text-ink-muted tabular-nums">
                      {count}
                      <Chevron open={expanded} />
                    </span>
                  </button>
                  {expanded && (
                    <ul>
                      {resorts
                        .filter((r) => r.state === st)
                        .map((r) => (
                          <MountainRow key={r.id} resort={r} onToggle={onToggle} />
                        ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {favoriteIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-[1100] bg-ink text-snow sm:bottom-0">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <span className="text-[15px]">
              <span className="font-semibold tabular-nums">{favoriteIds.length}</span>{" "}
              {favoriteIds.length === 1 ? "mountain" : "mountains"}
            </span>
            <button type="button" onClick={onDone} className="type-name text-[17px] underline underline-offset-4">
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { forecasts, forecastState, favoriteIds, savedListsReady } = useAppState();
  const [editing, setEditing] = useState(false);
  const alerts = useAlerts();

  const favorites = favoriteIds.flatMap((id) => getResort(id) ?? []);
  // Most snow this week first; starring order breaks ties.
  const sorted = forecasts
    ? [...favorites].sort((a, b) => (forecasts[b.id]?.next7In ?? 0) - (forecasts[a.id]?.next7In ?? 0))
    : favorites;
  const picking = savedListsReady && (favorites.length === 0 || editing);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <h1 className="sr-only">Your mountains</h1>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Starring keeps the picker open (so a first visit can pick several) until Done. */}
        {picking && <MountainPicker onToggle={() => setEditing(true)} onDone={() => setEditing(false)} />}

        {savedListsReady && favorites.length > 0 && !editing && (
          <>
            <TerrainBand />
            {forecasts && <Headline list={favorites} forecasts={forecasts} />}
            {alerts && <Warnings list={favorites} alerts={alerts} />}
            <YourWeek list={sorted} forecasts={forecasts} onEdit={() => setEditing(true)} />
            {forecastState === "error" && (
              <p className="px-4 pt-3 text-[14px] text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>
            )}
            <footer className="rule-row mt-6 px-4 pt-3 pb-8 text-[11px] text-ink-faint">
              Forecasts from{" "}
              <a className="underline" href="https://open-meteo.com/">
                Open-Meteo
              </a>
              .
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
