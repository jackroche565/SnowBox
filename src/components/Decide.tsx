"use client";

import Link from "next/link";
import { useState } from "react";
import { onMyPasses, useAppState } from "@/components/AppState";
import { WindIcon } from "@/components/Icons";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import RegionPicker from "@/components/RegionPicker";
import { passText } from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import { formatDrive, isDrivable, rankDay, type Pick } from "@/lib/decide";
import { formatDay, formatInches } from "@/lib/format";
import { POWDER_INCHES } from "@/lib/outlook";
import { WIND_HOLD_MPH } from "@/lib/resortForecast";
import { regionLabel, resortsIn } from "@/lib/regions";
import { resortPath } from "@/lib/resorts";
import { formatOpening, openingDate } from "@/lib/season";

// Where to ski on a day, two simple ways: most new snow, or closest. The two are never blended;
// drive time sits beside each mountain in the snow view. Switches for the view, passes and
// starting point sit at the top. Mountains that aren't open yet stay in the list, greyed out.

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
    isDrivable(pick.driveHours) && `${formatDrive(pick.driveHours)} drive`,
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

type View = "snow" | "closest";

/**
 * The switches, all at the top: what to rank by, which passes, and where you're starting from
 * (which "Closest" needs).
 */
function Controls({ view, onView }: { view: View; onView: (v: View) => void }) {
  const { origin } = useAppState();
  const [editing, setEditing] = useState(false);
  return (
    <section aria-label="Options" className="px-4 pt-3.5 pb-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <SegmentedControl
          label="Rank by"
          value={view}
          onChange={onView}
          segments={[
            { value: "snow", label: "Most snow" },
            { value: "closest", label: "Closest", disabled: !origin, title: origin ? undefined : "Set where you're starting from first" },
          ]}
        />
        <PassPicker />
      </div>
      <p className="mt-3 text-[14px]">
        {origin ? (
          <>
            From <span className="font-semibold">{origin.label.split(",")[0]}</span>{" "}
            <button type="button" aria-expanded={editing} onClick={() => setEditing((v) => !v)} className="font-semibold underline underline-offset-4">
              {editing ? "Done" : "Change"}
            </button>
          </>
        ) : (
          <button type="button" aria-expanded={editing} onClick={() => setEditing((v) => !v)} className="font-semibold underline underline-offset-4">
            Set where you&apos;re starting from
          </button>
        )}
      </p>
      {editing && <LocationSearch startEditing cancelable={false} onLocated={() => setEditing(false)} className="mt-2.5" />}
    </section>
  );
}

export default function Decide() {
  const { forecasts, forecastState, origin, myPasses, region } = useAppState();
  const [dayIndex, setDayIndex] = useState(0);
  const [chosenView, setView] = useState<View>("snow");
  // "Closest" needs a starting point.
  const view = chosenView === "closest" && !origin ? "snow" : chosenView;
  const [showAll, setShowAll] = useState(false);

  const inRegion = resortsIn(region);
  // The region's own days (forecasts from other regions may be loaded too, in other time zones).
  const days = (forecastState === "ready" && inRegion.map((r) => forecasts?.[r.id]).find(Boolean)?.upcoming) || [];
  const day = days[dayIndex];
  const mine = inRegion.filter((r) => onMyPasses(r.passes, myPasses));
  // Most snow first (ties, including no snow at all, go closest first), or simply closest first.
  // By date: the region's mountains can sit in different time zones.
  const rank = (date: string, by: View) => (forecasts ? rankDay(mine, forecasts, date, origin, by, true) : []);
  const picks = day ? rank(day.date, view) : [];
  const strip = days.map((d) => ({ date: d.date, maxIn: Math.max(0, ...rank(d.date, "snow").map((p) => p.snowIn)) }));

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

        <div className="px-4 pt-3.5 pb-2.5">
          <RegionPicker />
        </div>
        {days.length > 0 && <DayStrip days={strip} value={dayIndex} onChange={setDayIndex} />}

        <Controls view={view} onView={setView} />

        {forecastState === "error" && <p className="px-4 pt-4 text-[15px] text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>}
        {forecastState === "loading" && <p className="px-4 pt-4 text-[15px] text-ink-muted">Loading forecast…</p>}

        {forecasts && day && (
          <section aria-label={`Mountains ${dayName}`} className="rule-section">
            {mine.length === 0 && <p className="px-4 pt-3.5 text-[14px] text-ink-muted">No {regionLabel(region)} mountains on the passes you chose.</p>}
            {mine.length > 0 && (!anySnow || !anyOpen) && (
              <div className="px-4 pt-3.5 pb-1 text-[14px]">
                {!anySnow && <p className="font-semibold">No new snow {dayName}.</p>}
                {!anyOpen && (
                  <p className="text-ink-muted">
                    Nothing is open yet.
                    {firstToOpen?.opensOn && ` ${firstToOpen.name} is projected to open first, on ${formatOpening(firstToOpen.opensOn)}.`}
                  </p>
                )}
              </div>
            )}
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


        <p className="mt-6 px-4 text-[10px] text-ink-faint">
          Drive times are estimated from distance, without traffic. Data:{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>
        </p>
      </main>
    </>
  );
}
