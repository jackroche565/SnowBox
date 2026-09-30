"use client";

import Link from "next/link";
import { useState } from "react";
import { onMyPasses, useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import { StarIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import { bestThisWeek, formatDrive } from "@/lib/decide";
import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatTemp } from "@/lib/format";
import { snowNote } from "@/lib/outlook";
import { getResort, resortPath, resorts, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

type Order = "mine" | "snow";

// Mini bars share a floor so a dusting doesn't look like a storm.
const MINI_SCALE_INCHES = 6;
const MINI_HEIGHT_PX = 28;

const NOTE_TONE = {
  powder: "font-semibold text-alpenglow",
  snow: "font-medium text-glacier",
  none: "text-ink-muted",
};

function MiniBars({ days }: { days: DailyForecast[] }) {
  const max = Math.max(MINI_SCALE_INCHES, ...days.map((d) => d.snowIn ?? 0));
  return (
    <span aria-hidden="true" className="flex items-end gap-[3px] border-b border-line" style={{ height: MINI_HEIGHT_PX }}>
      {days.map((d, i) => {
        const snow = d.snowIn ?? 0;
        return (
          <span
            key={d.date}
            title={`${formatDay(d.date, i)}: ${formatInches(d.snowIn)}`}
            className={`w-[5px] rounded-t-[1px] ${i === 0 ? "bg-navy" : "bg-glacier"}`}
            style={{ height: snow > 0 ? `max(${(snow / max) * 100}%, 2px)` : 0 }}
          />
        );
      })}
    </span>
  );
}

function MountainRow({ resort, forecast }: { resort: Resort; forecast: ResortForecast | undefined }) {
  const note = forecast && snowNote(forecast);
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={resortPath(resort.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-glacier/[.05] sm:gap-5">
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
          <>
            <MiniBars days={forecast.upcoming} />
            <span className="hidden w-14 text-right tabular-nums md:block">
              <span className="block text-lg">{formatInches(forecast.next3In)}</span>
              <span className="block text-[10px] tracking-wide text-ink-muted uppercase">3 days</span>
            </span>
            <span className="w-14 text-right tabular-nums">
              <span className="block text-xl font-semibold">{formatInches(forecast.next7In)}</span>
              <span className="block text-[10px] tracking-wide text-ink-muted uppercase">7 days</span>
            </span>
          </>
        )}
      </Link>
    </li>
  );
}

function MountainPicker({ onToggle, onDone }: { onToggle: () => void; onDone: () => void }) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const states = [...new Set(resorts.map((r) => r.state))];

  return (
    <section aria-label="Choose your mountains" className="rounded-lg border border-line bg-white p-4 sm:p-5">
      <p className="text-sm text-ink-muted">Star the mountains you ski.</p>
      <div className="mt-4 flex flex-col gap-4">
        {states.map((state) => (
          <div key={state}>
            <div className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{US_STATES[state] ?? state}</div>
            <ul className="mt-1.5 flex flex-wrap gap-2">
              {resorts
                .filter((r) => r.state === state)
                .map((r) => {
                  const on = favoriteIds.includes(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          toggleFavorite(r.id);
                          onToggle();
                        }}
                        className={`flex items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-2.5 text-sm transition-colors ${
                          on ? "border-navy bg-navy text-snow" : "border-line bg-snow text-ink hover:border-ink/30"
                        }`}
                      >
                        <StarIcon filled={on} className={`h-4 w-4 ${on ? "text-gold" : "text-ink-muted"}`} />
                        {r.name}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      {favoriteIds.length > 0 && (
        <button
          type="button"
          onClick={onDone}
          className="mt-5 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-snow hover:bg-navy-2"
        >
          Done
        </button>
      )}
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

  if (!best) {
    return (
      <Link href="/decide" className="text-sm font-medium text-glacier hover:underline">
        Decide where to ski →
      </Link>
    );
  }

  const { pick, dayIndex } = best;
  return (
    <Link
      href="/decide"
      className="group block rounded-lg border border-line bg-white p-4 hover:border-glacier sm:p-5"
    >
      <span className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">Best bet this week</span>
      <span className="mt-1 flex items-baseline justify-between gap-3">
        <span className="truncate font-display text-3xl tracking-wide">{pick.resort.name}</span>
        <span className="shrink-0 text-2xl font-semibold tabular-nums">
          {formatInches(pick.snowIn)} <span className="text-base font-medium text-ink-muted">{formatDay(pick.day.date, dayIndex)}</span>
        </span>
      </span>
      <span className="mt-1 block text-sm text-ink-muted">
        {[pick.driveHours != null && `${formatDrive(pick.driveHours)} drive`, ...pick.reasons.map((r) => r.text)]
          .filter(Boolean)
          .join(" · ")}
      </span>
      <span className="mt-3 block text-sm font-medium text-glacier group-hover:underline">Compare options in Decide →</span>
    </Link>
  );
}

export default function Home() {
  const { forecasts, forecastState, favoriteIds, savedListsReady } = useAppState();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<Order>("mine");

  const favorites = favoriteIds.flatMap((id) => getResort(id) ?? []);
  const sorted =
    order === "snow" && forecasts
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
            <div className="flex items-center justify-between gap-3">
              <SegmentedControl
                label="Order"
                value={order}
                onChange={setOrder}
                segments={[
                  { value: "mine", label: "My order" },
                  { value: "snow", label: "Most snow" },
                ]}
              />
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink"
              >
                Edit
              </button>
            </div>

            <ul className="overflow-hidden rounded-lg border border-line bg-white">
              {sorted.map((r) => (
                <MountainRow key={r.id} resort={r} forecast={forecasts?.[r.id]} />
              ))}
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
