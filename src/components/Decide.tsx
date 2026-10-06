"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { onMyPasses, useAppState } from "@/components/AppState";
import { WindIcon } from "@/components/Icons";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import SiteHeader from "@/components/SiteHeader";
import { formatDrive, rankDay, type Pick } from "@/lib/decide";
import { DEMO_PEAK_DAY, demoForecasts } from "@/lib/demo";
import { formatDay, formatInches } from "@/lib/format";
import { POWDER_INCHES } from "@/lib/outlook";
import { WIND_HOLD_MPH } from "@/lib/resortForecast";
import { resortPath, resorts } from "@/lib/resorts";
import { formatOpening, isOpenOn, openingDate } from "@/lib/season";

// One question: where should I ski on this day? One answer, three backups, and the two settings
// that shape it (where you start, which pass) in a quiet line at the bottom.

const BACKUPS = 3;

function longDay(date: string, index: number): string {
  if (index === 0) return "today";
  if (index === 1) return "tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function snowColor(inches: number): string {
  if (inches < 0.1) return "var(--ink-zero)";
  return inches >= POWDER_INCHES ? "var(--alpenglow)" : "var(--glacier)";
}

const windHold = (p: Pick) => p.open && p.gustMph != null && p.gustMph >= WIND_HOLD_MPH;

/** Seven text tabs, each with the most new snow any mountain gets that day. */
function DayStrip({ days, value, onChange }: { days: { date: string; maxIn: number | null }[]; value: number; onChange: (i: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Day" className="grid grid-cols-7 border-b border-ink">
      {days.map((d, i) => {
        const on = i === value;
        return (
          <button
            key={d.date}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(i)}
            className={`-mb-px flex flex-col items-center border-b-[3px] pt-2.5 pb-2 tabular-nums ${on ? "border-ink" : "border-transparent"}`}
          >
            <span className={`text-[13px] ${on ? "font-bold text-ink" : "text-ink-muted"}`}>{formatDay(d.date, i)}</span>
            <span className={`type-figure mt-1 text-[15px] ${d.maxIn != null && d.maxIn >= 0.1 ? "text-glacier" : "text-ink-zero"}`}>
              {d.maxIn == null ? "—" : formatInches(d.maxIn)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** "About 2h 50m away. 4" more in the 2 days before." The day's snow is already the big figure. */
function Why({ pick }: { pick: Pick }) {
  if (pick.driveHours == null && pick.priorIn < 1 && pick.rainIn < 0.05 && !windHold(pick)) return null;
  return (
    <p className="mt-2 text-[15px]">
      {pick.driveHours != null && `About ${formatDrive(pick.driveHours).replace("~", "")} away.`}
      {pick.priorIn >= 1 && ` ${formatInches(pick.priorIn)} more in the 2 days before.`}
      {pick.rainIn >= 0.05 && " Rain likely."}
      {windHold(pick) && (
        <span className="ml-1 inline-flex items-center gap-1 align-baseline">
          <WindIcon className="h-4 w-4 self-center" /> Wind hold possible.
        </span>
      )}
    </p>
  );
}

function Answer({ pick, lead }: { pick: Pick; lead: string }) {
  return (
    <section aria-label="Best bet" className="px-4 pt-5 pb-6">
      <p className="text-[13px] text-ink-muted">{lead}</p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <h2 className="type-hero min-w-0 text-[54px]">{pick.resort.name}</h2>
        {pick.snowIn >= 0.1 && (
          <span className="type-hero shrink-0 text-[54px]" style={{ color: snowColor(pick.snowIn) }}>
            {formatInches(pick.snowIn)}
          </span>
        )}
      </div>
      <Why pick={pick} />
      <Link href={resortPath(pick.resort.id)} className="mt-4 flex h-11 items-center justify-center bg-ink text-[15px] font-semibold text-snow">
        View mountain
      </Link>
    </section>
  );
}

function Backups({ picks, label }: { picks: Pick[]; label: string }) {
  if (picks.length === 0) return null;
  return (
    <section aria-labelledby="backups" className="rule-section">
      <h2 id="backups" className="px-4 pt-3 pb-1 text-[13px] font-semibold">
        {label}
      </h2>
      <ul>
        {picks.map((p, i) => (
          <li key={p.resort.id} className={i > 0 ? "rule-row" : undefined}>
            <Link href={resortPath(p.resort.id)} className="flex items-baseline gap-3 px-4 py-3 hover:bg-white/50">
              <span className="type-name min-w-0 flex-1 truncate text-[19px]">{p.resort.name}</span>
              {windHold(p) && <WindIcon aria-label="Wind hold possible" className="h-4 w-4 shrink-0 self-center" />}
              <span className="type-figure w-12 shrink-0 text-right text-[22px]" style={{ color: snowColor(p.snowIn) }}>
                {formatInches(p.snowIn)}
              </span>
              {p.driveHours != null && (
                <span className="w-16 shrink-0 text-right text-[13px] text-ink-muted tabular-nums">{formatDrive(p.driveHours)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** First visit: the two things that shape the answer. */
function Setup() {
  return (
    <section aria-label="Set up" className="px-4 pt-5 pb-5">
      <h2 className="type-hero text-[36px] leading-[0.95] [font-stretch:65%]">Where are you starting from?</h2>
      <LocationSearch startEditing className="mt-4" />
      <p className="mt-5 text-[15px] font-semibold">Which pass do you have?</p>
      <PassPicker className="mt-2" />
      <p className="mt-1.5 text-[13px] text-ink-muted">None selected means every mountain.</p>
    </section>
  );
}

/** "From Boston · Ikon · Change", and the two settings when opened. */
function Settings() {
  const { origin, myPasses } = useAppState();
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Your settings" className="rule-section px-4 pt-3 pb-2">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[14px]">
        <span>
          From <span className="font-semibold">{origin ? origin.label.split(",")[0] : "anywhere"}</span>
          <span className="text-ink-faint"> · </span>
          <span className="font-semibold">{myPasses.length ? myPasses.join(", ") : "Any pass"}</span>
        </span>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="font-semibold underline underline-offset-4">
          {open ? "Done" : "Change"}
        </button>
      </p>
      {open && (
        <div className="mt-3 flex flex-col gap-3 pb-2">
          <LocationSearch startEditing cancelable={false} onLocated={() => setOpen(false)} />
          <PassPicker />
        </div>
      )}
    </section>
  );
}

export default function Decide({ demo = false }: { demo?: boolean }) {
  const { forecasts: real, forecastState, origin, myPasses, savedListsReady } = useAppState();
  const forecasts = useMemo(() => (demo && real ? demoForecasts(real, resorts) : real), [demo, real]);
  const [dayIndex, setDayIndex] = useState(demo ? DEMO_PEAK_DAY : 0);

  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  const day = days[dayIndex];
  const mine = resorts.filter((r) => onMyPasses(r.passes, myPasses));
  const rank = (i: number) => (forecasts ? rankDay(mine, forecasts, i, origin, null, "overall") : []);
  const picks = rank(dayIndex);
  const strip = days.map((d, i) => {
    const list = rank(i);
    return { date: d.date, maxIn: list.length ? Math.max(...list.map((p) => p.snowIn)) : null };
  });

  const dayName = day ? longDay(day.date, dayIndex) : "";
  const anySnow = picks.some((p) => p.snowIn >= 0.1);
  // With no snow anywhere, the useful answer is the closest open mountain.
  const shown = anySnow || !origin ? picks : rankDay(mine, forecasts ?? {}, dayIndex, origin, null, "closest");
  // Before the season, say who opens first instead of showing nothing.
  const firstToOpen =
    day && !mine.some((r) => isOpenOn(r, day.date))
      ? mine.reduce<(typeof mine)[number] | null>(
          (first, r) => (!first || openingDate(r, day.date) < openingDate(first, day.date) ? r : first),
          null,
        )
      : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-10">
        <h1 className="sr-only">Where to ski</h1>

        {demo && (
          <p className="border-b border-ink bg-ink px-4 py-2.5 text-[14px] text-snow">
            <span className="font-semibold">Demo:</span> a made-up storm in January, not a forecast.{" "}
            <Link href="/decide" className="underline underline-offset-2">
              Leave demo
            </Link>
          </p>
        )}

        {days.length > 0 && <DayStrip days={strip} value={dayIndex} onChange={setDayIndex} />}

        {savedListsReady && !origin && <Setup />}

        {forecastState === "error" && <p className="px-4 pt-4 text-[15px] text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>}
        {forecastState === "loading" && <p className="px-4 pt-4 text-[15px] text-ink-muted">Loading forecast…</p>}

        {forecasts && day && (
          <div className={!origin ? "rule-section" : undefined}>
            {shown.length > 0 ? (
              <>
                <Answer
                  pick={shown[0]}
                  lead={anySnow ? `Best bet ${dayName}` : `No new snow ${dayName}. Closest open:`}
                />
                <Backups picks={shown.slice(1, 1 + BACKUPS)} label={anySnow ? "Also good" : "Also close"} />
              </>
            ) : (
              <p className="px-4 pt-5 pb-6 text-[15px]">
                <span className="font-semibold">
                  {firstToOpen ? `Nothing's open yet ${dayIndex > 1 ? "on " : ""}${dayName}.` : `No open mountains ${dayName}.`}
                </span>
                {firstToOpen?.opensOn && ` ${firstToOpen.name} is projected to open first, on ${formatOpening(firstToOpen.opensOn)}.`}
                {firstToOpen && !demo && (
                  <>
                    {" "}
                    <Link href="/decide?demo=1" className="font-semibold underline underline-offset-4">
                      Try it with a sample storm
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {origin && <Settings />}

        <p className="mt-6 px-4 text-[11px] text-ink-faint">
          Drive times are estimated from distance, without traffic. Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>
          .
        </p>
      </main>
    </>
  );
}
