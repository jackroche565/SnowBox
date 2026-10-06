"use client";

import Link from "next/link";
import { useState } from "react";
import { onMyPasses, useAppState } from "@/components/AppState";
import { WindIcon } from "@/components/Icons";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import { passText } from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import { formatDrive, rankDay, type Pick } from "@/lib/decide";
import { formatDay, formatInches } from "@/lib/format";
import { POWDER_INCHES } from "@/lib/outlook";
import { WIND_HOLD_MPH } from "@/lib/resortForecast";
import { resortPath, resorts } from "@/lib/resorts";
import { formatOpening, openingDate } from "@/lib/season";

// One question: where's the most snow on this day? Mountains are ranked by that day's new snow
// and nothing else; drive time is shown beside each one, never mixed into the order. With no snow
// anywhere, the closest come first. Mountains that aren't open yet stay in the list, greyed out.

/** Rows shown before "Show all". */
const SHORT_LIST = 10;

function longDay(date: string, index: number): string {
  if (index === 0) return "today";
  if (index === 1) return "tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function snowColor(inches: number, open: boolean): string {
  if (!open || inches < 0.1) return "var(--ink-zero)";
  return inches >= POWDER_INCHES ? "var(--alpenglow)" : "var(--glacier)";
}

/** Seven text tabs, each with the most new snow any mountain gets that day. */
function DayStrip({ days, value, onChange }: { days: { date: string; maxIn: number }[]; value: number; onChange: (i: number) => void }) {
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
            <span className={`type-figure mt-1 text-[15px] ${d.maxIn >= 0.1 ? "text-glacier" : "text-ink-zero"}`}>{formatInches(d.maxIn)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Row({ pick }: { pick: Pick }) {
  const { resort, open } = pick;
  const windy = open && pick.gustMph != null && pick.gustMph >= WIND_HOLD_MPH;
  const details = [
    !open && (resort.opensOn ? `Opens ${formatOpening(resort.opensOn)}` : "Not open yet"),
    pick.driveHours != null && `${formatDrive(pick.driveHours)} drive`,
    passText(resort.passes),
    pick.rainIn >= 0.05 && "Rain likely",
  ].filter(Boolean);

  return (
    <li className="rule-row first:border-t-0">
      <Link href={resortPath(resort.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/50">
        <span className="min-w-0 flex-1">
          <span className={`type-name block truncate text-[19px] ${open ? "" : "text-ink-faint"}`}>{resort.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted tabular-nums">
            {details.join(" · ")}
            {windy && (
              <span className="flex items-center gap-1 text-ink">
                · <WindIcon className="h-3.5 w-3.5" /> Wind hold possible
              </span>
            )}
          </span>
        </span>
        <span className="type-figure shrink-0 text-[26px]" style={{ color: snowColor(pick.snowIn, open) }}>
          {formatInches(pick.snowIn)}
        </span>
      </Link>
    </li>
  );
}

/** First visit: the two things that shape the list. */
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

/** "From Boston · Any pass · Change", and the two settings when opened. */
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

export default function Decide() {
  const { forecasts, forecastState, origin, myPasses, savedListsReady } = useAppState();
  const [dayIndex, setDayIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  const day = days[dayIndex];
  const mine = resorts.filter((r) => onMyPasses(r.passes, myPasses));
  // Most snow first; on a tie (including no snow at all), the closest.
  const rank = (i: number) => (forecasts ? rankDay(mine, forecasts, i, origin, null, "snow", true) : []);
  const picks = rank(dayIndex);
  const strip = days.map((d, i) => ({ date: d.date, maxIn: Math.max(0, ...rank(i).map((p) => p.snowIn)) }));

  const dayName = day ? longDay(day.date, dayIndex) : "";
  const anySnow = picks.some((p) => p.snowIn >= 0.1);
  const anyOpen = picks.some((p) => p.open);
  const firstToOpen = day
    ? mine.reduce<(typeof mine)[number] | null>(
        (first, r) => (!first || openingDate(r, day.date) < openingDate(first, day.date) ? r : first),
        null,
      )
    : null;
  const shown = showAll ? picks : picks.slice(0, SHORT_LIST);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-10">
        <h1 className="sr-only">Where to ski</h1>

        {days.length > 0 && <DayStrip days={strip} value={dayIndex} onChange={setDayIndex} />}

        {savedListsReady && !origin && <Setup />}

        {forecastState === "error" && <p className="px-4 pt-4 text-[15px] text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>}
        {forecastState === "loading" && <p className="px-4 pt-4 text-[15px] text-ink-muted">Loading forecast…</p>}

        {forecasts && day && (
          <section aria-label={`Mountains ${dayName}`} className={!origin ? "rule-section" : undefined}>
            <div className="px-4 pt-4 pb-1">
              <h2 className="text-[15px] font-semibold">
                {anySnow ? `Most new snow ${dayName}` : `No new snow ${dayName}.${origin ? " Closest first." : ""}`}
              </h2>
              {!anyOpen && (
                <p className="mt-0.5 text-[14px] text-ink-muted">
                  Nothing is open yet.
                  {firstToOpen?.opensOn && ` ${firstToOpen.name} is projected to open first, on ${formatOpening(firstToOpen.opensOn)}.`}
                </p>
              )}
            </div>
            <ol>
              {shown.map((p) => (
                <Row key={p.resort.id} pick={p} />
              ))}
            </ol>
            {picks.length > SHORT_LIST && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rule-row w-full px-4 py-3 text-left text-[14px] font-semibold underline underline-offset-4"
              >
                {showAll ? "Show fewer" : `Show all ${picks.length}`}
              </button>
            )}
          </section>
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
