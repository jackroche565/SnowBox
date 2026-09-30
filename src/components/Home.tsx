"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import DailySnow from "@/components/DailySnow";
import FavoriteButton from "@/components/FavoriteButton";
import { SnowflakeIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import type { ResortForecast } from "@/lib/forecast";
import { PASS_COLORS, formatDay, formatInches, formatShortDate, formatTemp } from "@/lib/format";
import {
  WINDOWS,
  nextPowderDay,
  rank,
  regionHeadline,
  winterSigns,
  type Headline,
  type Window,
} from "@/lib/outlook";
import { PASSES, getResort, resortPath, resorts, type Resort } from "@/lib/resorts";

const BEST_BETS_COUNT = 5;
const SUGGESTION_COUNT = 6;
// Bars in Best Bets share a floor so a 1" leader doesn't draw a full-width bar.
const MIN_BAR_SCALE_INCHES = 6;

function SectionTitle({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 id={id} className="font-display text-3xl leading-none tracking-wider">
        {title}
      </h2>
      {action}
    </div>
  );
}

function Loading({ state }: { state: "loading" | "error" | "ready" }) {
  return (
    <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink-muted">
      {state === "error" ? "Forecast unavailable right now. Try again in a few minutes." : "Loading forecast…"}
    </p>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function HeroStats({ forecasts }: { forecasts: Record<string, ResortForecast> }) {
  const week = rank(resorts, forecasts, "next7");
  const late = rank(resorts, forecasts, "days8to16");
  const withSnow = week.filter((r) => r.value >= 1).length;
  const nothingFalling = (week[0]?.value ?? 0) < 0.1 && (late[0]?.value ?? 0) < 0.1;
  // With no snow anywhere, zeros say nothing; show the first signs of winter instead.
  const stats = nothingFalling
    ? winterSigns(resorts, forecasts).map((s) => ({
        label: s.label,
        value: s.value,
        sub: `${s.resort.name} · ${formatShortDate(s.date)}`,
      }))
    : [
        { label: "Resorts with snow this week", value: `${withSnow}/${resorts.length}` },
        { label: "Most in 7 days", value: formatInches(week[0]?.value), sub: week[0]?.value ? week[0].resort.name : "—" },
        { label: "Most in days 8–16", value: formatInches(late[0]?.value), sub: late[0]?.value ? late[0].resort.name : "—" },
      ];
  if (stats.length === 0) return null;
  return (
    <dl
      className="mt-6 grid max-w-2xl gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
      aria-label="Region at a glance"
    >
      {stats.map((s) => (
        <div key={s.label} className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
          <dt className="text-[11px] leading-tight text-snow/65 sm:text-xs">{s.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{s.value}</dd>
          {s.sub && <dd className="text-xs leading-snug text-snow/65">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

const TONE_LABEL: Record<Headline["tone"], string> = {
  storm: "Storm incoming",
  snow: "Snow this week",
  "long-range": "Long-range signal",
  quiet: "Off-season",
};

// ── My Mountains ──────────────────────────────────────────────────────

function MountainCard({ resort, forecast }: { resort: Resort; forecast: ResortForecast | undefined }) {
  const powder = forecast && nextPowderDay(forecast);
  const stats = forecast && [
    { label: "Today", value: forecast.todayIn },
    { label: "3 days", value: forecast.next3In },
    { label: "7 days", value: forecast.next7In, strong: true },
    { label: "8–16", value: forecast.days8to16In, hint: "Long range: a trend, not a promise" },
  ];

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className={`h-1 ${powder ? "bg-alpenglow" : "bg-glacier"}`} />
      <div className="flex items-start gap-2 px-4 pt-3">
        <Link href={resortPath(resort.id)} className="group min-w-0 flex-1">
          <h3 className="truncate font-display text-3xl leading-tight tracking-wide group-hover:text-glacier">
            {resort.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-ink-muted tabular-nums">
            <span>{resort.state}</span>
            <PassTags passes={resort.passes} />
            {forecast && (
              <span>
                Now <CountUp value={forecast.tempF} format={formatTemp} />
              </span>
            )}
          </div>
        </Link>
        <FavoriteButton id={resort.id} name={resort.name} className="-mr-1.5" />
      </div>

      {powder && (
        <p className="mx-4 mt-3 flex items-center gap-1.5 rounded-sm bg-alpenglow/10 px-2 py-1 text-xs font-semibold text-alpenglow">
          <SnowflakeIcon className="h-3.5 w-3.5" />
          Powder day {formatDay(powder.day.date, powder.index)} · {formatInches(powder.day.snowIn)}
        </p>
      )}

      {stats ? (
        <>
          <dl className="grid grid-cols-4 gap-2 px-4 pt-3">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] text-ink-muted" title={s.hint}>
                  {s.label}
                </dt>
                <dd className={`text-xl tabular-nums sm:text-2xl ${s.strong ? "font-semibold" : "text-ink"}`}>
                  {formatInches(s.value)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto px-4 pt-4 pb-4">
            <DailySnow days={forecast.upcoming} />
          </div>
        </>
      ) : (
        <p className="px-4 py-4 text-sm text-ink-muted">Loading forecast…</p>
      )}
    </article>
  );
}

function Suggestions({ forecasts }: { forecasts: Record<string, ResortForecast> | null }) {
  // Snowiest first when anything is falling; otherwise the biggest mountains.
  const picks = [...resorts]
    .sort(
      (a, b) =>
        (forecasts?.[b.id]?.next7In ?? 0) - (forecasts?.[a.id]?.next7In ?? 0) ||
        (b.verticalFt ?? 0) - (a.verticalFt ?? 0),
    )
    .slice(0, SUGGESTION_COUNT);

  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-5 py-6">
      <h3 className="font-display text-2xl tracking-wide">Pin your home mountains</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">
        Star the resorts you ski most. They&apos;ll show up here first, with today&apos;s snow, the week ahead and a
        heads-up on powder days.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {picks.map((r) => (
          <li key={r.id} className="flex items-center rounded-full border border-line bg-snow pr-3 text-sm">
            <FavoriteButton id={r.id} name={r.name} />
            {r.name}
          </li>
        ))}
      </ul>
      <Link href="/explore" className="mt-4 inline-block text-sm font-medium text-glacier hover:underline">
        Browse all {resorts.length} resorts →
      </Link>
    </div>
  );
}

// ── Best bets ─────────────────────────────────────────────────────────

function BestBets({ forecasts }: { forecasts: Record<string, ResortForecast> }) {
  const { passFilter, setPassFilter } = useAppState();
  const [span, setSpan] = useState<Window>("next7");

  const list = resorts.filter((r) => passFilter === "All" || r.passes.includes(passFilter));
  const top = rank(list, forecasts, span).slice(0, BEST_BETS_COUNT);
  const scale = Math.max(MIN_BAR_SCALE_INCHES, top[0]?.value ?? 0);
  const anySnow = top.some((r) => r.value >= 0.1);

  return (
    <section aria-labelledby="best-bets" className="flex flex-col gap-3">
      <SectionTitle id="best-bets" title="Best Bets" />
      <div className="flex flex-col gap-2">
        <SegmentedControl
          label="Forecast window"
          value={span}
          onChange={setSpan}
          className="w-full"
          segments={(Object.keys(WINDOWS) as Window[]).map((w) => ({ value: w, label: WINDOWS[w].short }))}
        />
        <SegmentedControl
          label="Filter by pass"
          value={passFilter}
          onChange={setPassFilter}
          className="w-full"
          segments={[
            { value: "All", label: "All passes" },
            ...PASSES.map((pass) => ({ value: pass, label: pass, color: PASS_COLORS[pass] })),
          ]}
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {anySnow ? (
          <ol>
            {top.map(({ resort, value }, i) => (
              <li key={resort.id} className="border-b border-line last:border-b-0">
                <Link
                  href={resortPath(resort.id)}
                  className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-glacier/[.06]"
                >
                  <span className="font-display text-2xl leading-none text-ink-muted">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{resort.name}</span>
                      <PassTags passes={resort.passes} />
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line/60">
                      <span
                        className="block h-full rounded-full bg-glacier"
                        style={{ width: `${Math.max(2, (value / scale) * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="text-xl font-semibold tabular-nums">{formatInches(value)}</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-4 py-6 text-sm text-ink-muted">
            No snow in the forecast for {WINDOWS[span].label.toLowerCase()}
            {passFilter !== "All" && ` at ${passFilter} resorts`}. We&apos;ll rank resorts here as soon as the models
            show some.
          </p>
        )}
      </div>
      {span === "days8to16" && anySnow && (
        <p className="text-xs text-ink-muted">Days 8–16 are long range. Use them to spot a trend, not to book a trip.</p>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const { forecasts, forecastState, favoriteIds, savedListsReady } = useAppState();
  const headline = useMemo(() => (forecasts ? regionHeadline(resorts, forecasts) : null), [forecasts]);
  const favorites = favoriteIds.flatMap((id) => getResort(id) ?? []);

  return (
    <>
      <SiteHeader
        eyebrow={headline ? `Northeast · ${TONE_LABEL[headline.tone]}` : "Northeast outlook"}
        title={headline?.title ?? "Snowline"}
        subtitle={
          (headline &&
            (headline.tone === "quiet"
              ? `${headline.detail} Opening days are set by each resort; here are the first signs of winter.`
              : headline.detail)) ??
          (forecastState === "error"
            ? "Forecast unavailable right now."
            : "Reading the latest forecast for 19 Northeast resorts…")
        }
      >
        {forecasts && <HeroStats forecasts={forecasts} />}
      </SiteHeader>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 pt-2 pb-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="my-mountains" className="flex flex-col gap-3">
            <SectionTitle
              id="my-mountains"
              title="My Mountains"
              action={
                favorites.length > 0 && (
                  <Link href="/explore" className="text-sm font-medium text-glacier hover:underline">
                    Add more
                  </Link>
                )
              }
            />
            {!savedListsReady ? null : favorites.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {favorites.map((r) => (
                  <MountainCard key={r.id} resort={r} forecast={forecasts?.[r.id]} />
                ))}
              </div>
            ) : (
              <Suggestions forecasts={forecasts} />
            )}
          </section>

        </div>

        <aside className="flex flex-col gap-8">
          {forecasts ? <BestBets forecasts={forecasts} /> : <Loading state={forecastState} />}
        </aside>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-xs text-ink-muted">
        Forecasts from{" "}
        <a className="underline" href="https://open-meteo.com/">
          Open-Meteo
        </a>{" "}
        weather models, refreshed every 30 minutes. Snow totals are modeled, not resort-reported.
      </footer>
    </>
  );
}
