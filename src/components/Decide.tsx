"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { COMPARE_LIMIT, onMyPasses, useAppState } from "@/components/AppState";
import Estimate from "@/components/Estimate";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import PassTags from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import { RANK_BY, formatDrive, rankDay, scoreDay, type Pick, type RankBy } from "@/lib/decide";
import type { DailyForecast } from "@/lib/forecast";
import { formatDay, formatFeet, formatInches, formatTemp } from "@/lib/format";
import { getResort, isEstimate, resortPath, resorts } from "@/lib/resorts";

type MaxDrive = "any" | "1" | "2" | "3" | "4";

function longDay(date: string, index: number): string {
  if (index === 0) return "today";
  if (index === 1) return "tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function DayPicker({ days, value, onChange }: { days: DailyForecast[]; value: number; onChange: (i: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Day" className="flex gap-1.5">
      {days.map((d, i) => {
        const on = i === value;
        return (
          <button
            key={d.date}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(i)}
            className={`flex min-w-0 flex-1 flex-col items-center rounded-[10px] border py-[7px] tabular-nums transition-colors ${
              on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/30"
            }`}
          >
            <span className="text-xs font-semibold">{formatDay(d.date, i)}</span>
            <span className="text-[11px] opacity-70">{Number(d.date.slice(8))}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Trail-marker shapes as icons for the three ways to rank. Always ink; never a difficulty. */
const RANK_ICON: Record<RankBy, ReactNode> = {
  overall: <path d="M12 2 L22 12 L12 22 L2 12 Z" />,
  snow: <circle cx="12" cy="12" r="10" />,
  closest: <rect x="3" y="3" width="18" height="18" rx="1" />,
};

function RankPicker({ value, onChange, closestAvailable }: { value: RankBy; onChange: (v: RankBy) => void; closestAvailable: boolean }) {
  return (
    <div role="radiogroup" aria-label="Rank by" className="grid grid-cols-3 gap-1.5">
      {(Object.keys(RANK_BY) as RankBy[]).map((v) => {
        const on = v === value;
        const disabled = v === "closest" && !closestAvailable;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            title={disabled ? "Set where you're starting from first" : undefined}
            onClick={() => onChange(v)}
            className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-40 ${
              on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/30"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              {RANK_ICON[v]}
            </svg>
            <span className="text-[13px] font-semibold">{RANK_BY[v]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ResultRow({ pick, rank, highlight }: { pick: Pick; rank: number; highlight: boolean }) {
  const { compareIds, toggleCompare } = useAppState();
  const { resort } = pick;
  const inCompare = compareIds.includes(resort.id);
  const full = !inCompare && compareIds.length >= COMPARE_LIMIT;

  return (
    <li className={`flex items-center gap-3 border-t border-hairline px-4 py-3 first:border-t-0 ${highlight ? "bg-ice/60" : ""}`}>
      <span className={`type-hero w-6 shrink-0 text-[26px] tabular-nums ${highlight ? "text-glacier" : "text-ink-zero"}`}>{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Link href={resortPath(resort.id)} className="type-name truncate text-lg hover:text-glacier">
            {resort.name}
          </Link>
          <PassTags passes={resort.passes} />
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs">
          {pick.driveHours != null && (
            <span className="text-ink-faint tabular-nums">{formatDrive(pick.driveHours)} drive · est., no traffic</span>
          )}
          {pick.reasons.map((r) => (
            <span key={r.text} className={`font-medium ${r.tone === "good" ? "text-glacier" : "text-barn"}`}>
              {r.text}
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`type-figure block text-[22px] ${pick.snowIn >= 0.1 ? "text-ink" : "text-ink-zero"}`}>{formatInches(pick.snowIn)}</span>
        <span className="mt-0.5 block text-[11px] text-ink-faint">new snow</span>
      </span>
      <input
        type="checkbox"
        checked={inCompare}
        disabled={full}
        onChange={() => toggleCompare(resort.id)}
        aria-label={`Compare ${resort.name} side by side`}
        title={full ? `Compare up to ${COMPARE_LIMIT} at a time` : "Compare side by side"}
        className="h-4 w-4 shrink-0 accent-[#0f1a2a] disabled:opacity-40"
      />
    </li>
  );
}

type Row = {
  label: string;
  render: (p: Pick) => ReactNode;
  /** Which end of the row is better; that value is bolded. */
  best?: "high" | "low";
  value?: (p: Pick) => number | null | undefined;
};

function HeadToHead({ picks, dayLabel }: { picks: Pick[]; dayLabel: string }) {
  const { toggleCompare, forecasts } = useAppState();
  const rows: Row[] = [
    { label: `Snow ${dayLabel}`, render: (p) => formatInches(p.snowIn), best: "high", value: (p) => p.snowIn },
    { label: "2 days before", render: (p) => formatInches(p.priorIn), best: "high", value: (p) => p.priorIn },
    { label: "Rain", render: (p) => `${p.rainIn.toFixed(2)}"`, best: "low", value: (p) => p.rainIn },
    { label: "Peak gust", render: (p) => (p.gustMph == null ? "—" : `${Math.round(p.gustMph)} mph`), best: "low", value: (p) => p.gustMph },
    { label: "High / low", render: (p) => `${formatTemp(p.day.highF)} / ${formatTemp(p.day.lowF)}` },
    {
      label: "Next 7 days",
      render: (p) => formatInches(forecasts?.[p.resort.id]?.next7In),
      best: "high",
      value: (p) => forecasts?.[p.resort.id]?.next7In,
    },
    { label: "Drive (est.)", render: (p) => (p.driveHours == null ? "—" : formatDrive(p.driveHours)), best: "low", value: (p) => p.driveHours },
    {
      label: "Vertical",
      render: (p) => (
        <>
          {formatFeet(p.resort.verticalFt)}
          {isEstimate(p.resort, "verticalFt") && <Estimate />}
        </>
      ),
      best: "high",
      value: (p) => p.resort.verticalFt,
    },
    {
      label: "Trails",
      render: (p) => (
        <>
          {p.resort.trails ?? "—"}
          {isEstimate(p.resort, "trails") && <Estimate />}
        </>
      ),
      best: "high",
      value: (p) => p.resort.trails,
    },
  ];

  // The single best value in a row, or none on a tie or when nothing is known.
  function leader(row: Row): number | null {
    if (!row.best || !row.value) return null;
    const values = picks.map((p) => row.value!(p) ?? null);
    const known = values.filter((v): v is number => v != null);
    if (known.length < 2) return null;
    const target = row.best === "high" ? Math.max(...known) : Math.min(...known);
    if (row.best === "high" && target <= 0) return null;
    if (values.filter((v) => v === target).length > 1) return null;
    return values.indexOf(target);
  }

  return (
    <section aria-label="Side by side" className="sheet overflow-x-auto p-3 sm:p-5">
      <table className="w-full table-fixed border-collapse text-sm tabular-nums">
        <colgroup>
          <col className="w-28 sm:w-36" />
          {picks.map((p) => (
            <col key={p.resort.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Measure
            </th>
            {picks.map((p) => (
              <th key={p.resort.id} scope="col" className="px-2 pb-3 text-left align-top font-normal">
                <Link href={resortPath(p.resort.id)} className="type-name text-lg leading-tight hover:text-glacier sm:text-xl">
                  {p.resort.name}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleCompare(p.resort.id)}
                  aria-label={`Remove ${p.resort.name}`}
                  className="mt-1 block text-[11px] font-medium text-ink-muted hover:text-barn"
                >
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const lead = leader(row);
            return (
              <tr key={row.label} className="border-t border-hairline">
                <th scope="row" className="py-2.5 pr-2 text-left text-xs font-medium text-ink-muted">
                  {row.label}
                </th>
                {picks.map((p, i) => (
                  <td key={p.resort.id} className={`px-2 py-2.5 ${i === lead ? "font-bold" : ""}`}>
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default function Decide() {
  const { forecasts, forecastState, origin, myPasses, compareIds } = useAppState();
  const [dayIndex, setDayIndex] = useState(0);
  const [maxDrive, setMaxDrive] = useState<MaxDrive>("any");
  const [chosenRank, setRankBy] = useState<RankBy>("overall");
  const [settingFrom, setSettingFrom] = useState(false);
  // "Closest" needs a starting point; without one, fall back to the blend.
  const rankBy = chosenRank === "closest" && !origin ? "overall" : chosenRank;

  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  const day = days[dayIndex];
  const maxHours = origin && maxDrive !== "any" ? Number(maxDrive) : null;
  const picks = forecasts
    ? rankDay(resorts.filter((r) => onMyPasses(r.passes, myPasses)), forecasts, dayIndex, origin, maxHours, rankBy)
    : [];
  const anySnow = picks.some((p) => p.snowIn >= 0.1);

  // Picked resorts stay in the head-to-head even if the filters above hide them from the list.
  const compared = forecasts
    ? compareIds.flatMap((id) => {
        const resort = getResort(id);
        const forecast = forecasts[id];
        const pick = resort && forecast && scoreDay(resort, forecast, dayIndex, origin);
        return pick ? [pick] : [];
      })
    : [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-3 pb-10">
        <h1 className="sr-only">Decide where to ski</h1>

        <section aria-label="Options" className="sheet flex flex-col gap-3.5 p-4">
          {days.length ? <DayPicker days={days} value={dayIndex} onChange={setDayIndex} /> : <p className="text-sm text-ink-muted">Loading…</p>}
          <RankPicker value={rankBy} onChange={setRankBy} closestAvailable={origin !== null} />

          <div className="flex flex-col gap-2.5 border-t border-hairline pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={() => setSettingFrom((v) => !v)}
                aria-expanded={settingFrom}
                className="rounded-full bg-chip px-2.5 py-1.5 hover:bg-line"
              >
                {origin ? (
                  <>
                    From <span className="font-semibold">{origin.label.split(",")[0]}</span>
                  </>
                ) : (
                  <span className="font-medium text-glacier">Set where you&apos;re starting from</span>
                )}
              </button>
              {origin && (
                <label className="relative flex items-center rounded-full bg-chip py-1.5 pr-6 pl-2.5 hover:bg-line">
                  <span className="sr-only">Maximum drive</span>
                  <select
                    value={maxDrive}
                    onChange={(e) => setMaxDrive(e.target.value as MaxDrive)}
                    className="cursor-pointer appearance-none bg-transparent font-semibold focus:outline-none"
                  >
                    <option value="any">Any drive</option>
                    {(["1", "2", "3", "4"] as const).map((h) => (
                      <option key={h} value={h}>
                        Up to {h} hr{h === "1" ? "" : "s"}
                      </option>
                    ))}
                  </select>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-2 h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9 L12 15 L18 9" />
                  </svg>
                </label>
              )}
            </div>
            {settingFrom && <LocationSearch onLocated={() => setSettingFrom(false)} startEditing />}
            <PassPicker />
          </div>
        </section>

        {forecastState === "error" && <p className="px-2 text-sm text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>}
        {forecastState === "loading" && <p className="px-2 text-sm text-ink-muted">Loading forecast…</p>}

        {forecasts && day && (
          <>
            {!anySnow && picks.length > 0 && (
              <p className="px-2 pt-1 text-[13px] text-ink-muted">
                No new snow forecast {longDay(day.date, dayIndex)}.
                {rankBy !== "closest" &&
                  (origin ? " Ranked by drive time." : " Set where you're starting from to rank by drive time.")}
              </p>
            )}

            {picks.length > 0 ? (
              <ol className="sheet overflow-hidden">
                {picks.map((p, i) => (
                  <ResultRow key={p.resort.id} pick={p} rank={i + 1} highlight={i === 0 && p.snowIn >= 0.1} />
                ))}
              </ol>
            ) : (
              <p className="sheet p-4 text-sm text-ink-muted">
                No resorts within {maxDrive} hr{maxDrive === "1" ? "" : "s"} on {myPasses.length ? "your passes" : "any pass"}. Try a
                longer drive.
              </p>
            )}

            {compared.length === 1 && <p className="px-2 text-[13px] text-ink-muted">Tick one more to compare side by side.</p>}
            {compared.length >= 2 && <HeadToHead picks={compared} dayLabel={dayIndex === 0 ? "today" : formatDay(day.date, dayIndex)} />}
          </>
        )}

        <p className="px-2 text-xs text-ink-faint">
          Drive times are estimated from distance and don&apos;t include traffic. Best overall: new snow on the day
          counts most, snow in the 2 days before adds half as much, and rain, gusts of 40+ mph and each hour of
          driving count against. Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>
          .
        </p>
      </main>
    </>
  );
}
