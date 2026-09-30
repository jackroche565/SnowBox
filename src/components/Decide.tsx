"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { COMPARE_LIMIT, onMyPasses, useAppState } from "@/components/AppState";
import Estimate from "@/components/Estimate";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import PassTags from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import { formatDrive, rankDay, scoreDay, type Pick } from "@/lib/decide";
import type { DailyForecast } from "@/lib/forecast";
import { formatDay, formatFeet, formatInches, formatTemp } from "@/lib/format";
import { getResort, isEstimate, resortPath, resorts } from "@/lib/resorts";

type MaxDrive = "any" | "1" | "2" | "3" | "4";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <div className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function longDay(date: string, index: number): string {
  if (index === 0) return "today";
  if (index === 1) return "tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function DayPicker({ days, value, onChange }: { days: DailyForecast[]; value: number; onChange: (i: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Day" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {days.map((d, i) => {
        const on = i === value;
        return (
          <button
            key={d.date}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(i)}
            className={`flex min-w-12 shrink-0 flex-col items-center rounded-md border px-2 py-1.5 tabular-nums transition-colors ${
              on ? "border-navy bg-navy text-snow" : "border-line bg-white text-ink hover:border-ink/30"
            }`}
          >
            <span className="text-xs font-semibold">{formatDay(d.date, i)}</span>
            <span className={`text-[11px] ${on ? "text-snow/70" : "text-ink-muted"}`}>{Number(d.date.slice(8))}</span>
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
    <li className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${highlight ? "bg-glacier/[.07]" : ""}`}>
      <input
        type="checkbox"
        checked={inCompare}
        disabled={full}
        onChange={() => toggleCompare(resort.id)}
        aria-label={`Compare ${resort.name}`}
        title={full ? `Compare up to ${COMPARE_LIMIT} at a time` : "Compare side by side"}
        className="h-4 w-4 shrink-0 accent-navy disabled:opacity-40"
      />
      <span className="w-6 shrink-0 font-display text-2xl leading-none text-ink-muted">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Link href={resortPath(resort.id)} className="truncate font-semibold hover:text-glacier">
            {resort.name}
          </Link>
          <PassTags passes={resort.passes} />
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {pick.driveHours != null && <span className="text-ink-muted tabular-nums">{formatDrive(pick.driveHours)} drive</span>}
          {pick.reasons.map((r) => (
            <span key={r.text} className={`font-medium ${r.tone === "good" ? "text-glacier" : "text-barn"}`}>
              {r.text}
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span className="block text-2xl font-semibold">{formatInches(pick.snowIn)}</span>
        <span className="block text-[10px] tracking-wide text-ink-muted uppercase">New snow</span>
      </span>
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
    <section aria-label="Side by side" className="overflow-x-auto rounded-lg border border-line bg-white p-3 sm:p-5">
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
                <Link href={resortPath(p.resort.id)} className="font-display text-xl leading-none tracking-wide hover:text-glacier sm:text-2xl">
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
              <tr key={row.label} className="border-t border-line">
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

  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  const day = days[dayIndex];
  const maxHours = origin && maxDrive !== "any" ? Number(maxDrive) : null;
  const picks = forecasts
    ? rankDay(resorts.filter((r) => onMyPasses(r.passes, myPasses)), forecasts, dayIndex, origin, maxHours)
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
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-4 pb-10">
        <h1 className="sr-only">Decide where to ski</h1>

        <section aria-label="Options" className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4 sm:p-5">
          <Field label="Day">
            {days.length ? <DayPicker days={days} value={dayIndex} onChange={setDayIndex} /> : <span className="text-sm text-ink-muted">Loading…</span>}
          </Field>
          <Field label="Passes">
            <PassPicker />
          </Field>
          <Field label="From">
            <LocationSearch />
          </Field>
          <Field label="Max drive">
            <SegmentedControl
              label="Max drive"
              value={maxDrive}
              onChange={setMaxDrive}
              className="w-fit"
              segments={(["any", "1", "2", "3", "4"] as MaxDrive[]).map((v) => ({
                value: v,
                label: v === "any" ? "Any" : `${v}h`,
                disabled: !origin && v !== "any",
                title: !origin && v !== "any" ? "Set where you're starting from first" : undefined,
              }))}
            />
          </Field>
        </section>

        {forecastState === "error" && <p className="text-sm text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>}
        {forecastState === "loading" && <p className="text-sm text-ink-muted">Loading forecast…</p>}

        {forecasts && day && (
          <>
            {!anySnow && picks.length > 0 && (
              <p className="text-sm text-ink-muted">
                No new snow forecast {longDay(day.date, dayIndex)}.{" "}
                {origin ? "Ranked by drive time." : "Set where you're starting from to rank by drive time."}
              </p>
            )}

            {picks.length > 0 ? (
              <ol className="overflow-hidden rounded-lg border border-line bg-white">
                {picks.map((p, i) => (
                  <ResultRow key={p.resort.id} pick={p} rank={i + 1} highlight={i === 0 && anySnow} />
                ))}
              </ol>
            ) : (
              <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink-muted">
                No resorts within {maxDrive}h on {myPasses.length ? "your passes" : "any pass"}. Try a longer drive.
              </p>
            )}

            {compared.length === 1 && <p className="text-sm text-ink-muted">Tick one more to compare side by side.</p>}
            {compared.length >= 2 && <HeadToHead picks={compared} dayLabel={dayIndex === 0 ? "today" : formatDay(day.date, dayIndex)} />}
          </>
        )}

        <p className="text-xs text-ink-muted">
          Drive times are estimated from distance and don&apos;t include traffic. Ranking: new snow on the day counts
          most, snow in the 2 days before adds half as much, and rain, gusts of 40+ mph and each hour of driving count
          against. Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>
          .
        </p>
      </main>
    </>
  );
}
