"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { COMPARE_LIMIT, onMyPasses, useAppState } from "@/components/AppState";
import Estimate from "@/components/Estimate";
import { WindIcon } from "@/components/Icons";
import LocationSearch from "@/components/LocationSearch";
import PassPicker from "@/components/PassPicker";
import { passText } from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import { RANK_BY, formatDrive, rankDay, scoreDay, type Pick, type RankBy } from "@/lib/decide";
import { formatDay, formatFeet, formatInches, formatTemp } from "@/lib/format";
import { POWDER_INCHES } from "@/lib/outlook";
import { WIND_HOLD_MPH } from "@/lib/resortForecast";
import { getResort, isEstimate, resortPath, resorts } from "@/lib/resorts";
import { formatOpening, isOpenOn, openingDate } from "@/lib/season";

type MaxDrive = "any" | "1" | "2" | "3" | "4";
type Option = "rank" | "from" | "drive" | "pass";

/** Rows shown under the top pick before "Show all". */
const SHORT_LIST = 4;

function longDay(date: string, index: number): string {
  if (index === 0) return "today";
  if (index === 1) return "tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

const windHold = (p: Pick) => p.open && p.gustMph != null && p.gustMph >= WIND_HOLD_MPH;

/** Text tabs for the next 7 days, each with the most snow any result gets that day. */
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
            <span
              className={`type-figure mt-1 text-[15px] ${d.maxIn != null && d.maxIn >= 0.1 ? "text-glacier" : "text-ink-zero"}`}
            >
              {d.maxIn == null ? "—" : formatInches(d.maxIn)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A bold, underlined word in the options sentence that opens its picker. */
function Word({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={`font-bold underline decoration-2 underline-offset-4 ${open ? "decoration-ink" : "decoration-ink/30 hover:decoration-ink"}`}
    >
      {children}
    </button>
  );
}

function TextChoice<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string, boolean?][]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map(([v, text, disabled]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={`border-b-2 pb-0.5 text-[14px] disabled:opacity-40 ${
            v === value ? "border-ink font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Detail({ pick }: { pick: Pick }) {
  const parts: ReactNode[] = [];
  if (pick.driveHours != null) parts.push(<span key="drive" className="tabular-nums">{formatDrive(pick.driveHours)} drive (est.)</span>);
  parts.push(<span key="pass">{passText(pick.resort.passes)}</span>);
  for (const r of pick.reasons) {
    // decide.ts words wind as "Gusts N mph…"; here it's said with its icon instead.
    if (!r.text.startsWith("Gusts")) parts.push(<span key={r.text}>{r.text}</span>);
  }
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && "· "}
          {p}
        </span>
      ))}
      {windHold(pick) && (
        <span className="flex items-center gap-1 text-ink">
          · <WindIcon className="h-3.5 w-3.5" /> Wind hold possible
        </span>
      )}
    </span>
  );
}

function CompareBox({ pick }: { pick: Pick }) {
  const { compareIds, toggleCompare } = useAppState();
  const { resort } = pick;
  const on = compareIds.includes(resort.id);
  const full = !on && compareIds.length >= COMPARE_LIMIT;
  return (
    <input
      type="checkbox"
      checked={on}
      disabled={full}
      onChange={() => toggleCompare(resort.id)}
      aria-label={`Compare ${resort.name} side by side`}
      title={full ? `Compare up to ${COMPARE_LIMIT} at a time` : "Compare side by side"}
      className="h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none border-2 border-ink bg-transparent checked:bg-ink disabled:opacity-30"
    />
  );
}

function snowColor(inches: number): string {
  if (inches < 0.1) return "var(--ink-zero)";
  return inches >= POWDER_INCHES ? "var(--alpenglow)" : "var(--glacier)";
}

function TopPick({ pick, dayLabel }: { pick: Pick; dayLabel: string }) {
  const { compareIds, toggleCompare } = useAppState();
  const on = compareIds.includes(pick.resort.id);
  const full = !on && compareIds.length >= COMPARE_LIMIT;
  return (
    <section aria-label="Best bet" className="px-4 pt-4 pb-5">
      <p className="text-[13px] text-ink-muted">Best bet {dayLabel}</p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <Link href={resortPath(pick.resort.id)} className="type-hero min-w-0 text-[54px] hover:underline">
          {pick.resort.name}
        </Link>
        <span className="type-hero shrink-0 text-[54px]" style={{ color: snowColor(pick.snowIn) }}>
          {formatInches(pick.snowIn)}
        </span>
      </div>
      <div className="mt-2.5">
        <Detail pick={pick} />
      </div>
      <button
        type="button"
        onClick={() => toggleCompare(pick.resort.id)}
        disabled={full}
        className="mt-3 text-[14px] font-semibold underline underline-offset-4 disabled:opacity-40"
      >
        {on ? `Remove ${pick.resort.name} from compare` : `Compare ${pick.resort.name}`}
      </button>
    </section>
  );
}

function ResultRow({ pick, rank }: { pick: Pick; rank: number }) {
  return (
    <li className="rule-row flex items-center gap-3 px-4 py-3">
      <span className="type-figure w-5 shrink-0 text-[17px] text-ink-faint">{rank}</span>
      <span className="min-w-0 flex-1">
        <Link href={resortPath(pick.resort.id)} className="type-name block truncate text-[19px] hover:underline">
          {pick.resort.name}
        </Link>
        <span className="mt-0.5 block">
          <Detail pick={pick} />
        </span>
      </span>
      <span className="type-figure shrink-0 text-[24px]" style={{ color: snowColor(pick.snowIn) }}>
        {formatInches(pick.snowIn)}
      </span>
      <CompareBox pick={pick} />
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
    <section aria-label="Side by side" className="rule-section overflow-x-auto border-b border-ink px-4 pt-3 pb-3">
      <h2 className="text-[13px] font-semibold">Side by side</h2>
      <table className="mt-2 w-full table-fixed border-collapse text-[14px] tabular-nums">
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
              <th key={p.resort.id} scope="col" className="px-2 pb-2.5 text-left align-top font-normal">
                <Link href={resortPath(p.resort.id)} className="type-name block text-[17px] leading-tight hover:underline">
                  {p.resort.name}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleCompare(p.resort.id)}
                  aria-label={`Remove ${p.resort.name}`}
                  className="mt-1 text-[11px] text-ink-muted underline underline-offset-2 hover:text-ink"
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
              <tr key={row.label} className="border-t border-rule">
                <th scope="row" className="py-2 pr-2 text-left text-[13px] font-normal text-ink-muted">
                  {row.label}
                </th>
                {picks.map((p, i) => (
                  <td key={p.resort.id} className={`px-2 py-2 ${i === lead ? "font-bold" : ""}`}>
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
  const [open, setOpen] = useState<Option | null>(null);
  const [showAll, setShowAll] = useState(false);
  // "Closest" needs a starting point; without one, fall back to the blend.
  const rankBy = chosenRank === "closest" && !origin ? "overall" : chosenRank;
  const toggle = (o: Option) => setOpen((cur) => (cur === o ? null : o));

  const days = forecasts ? (Object.values(forecasts)[0]?.upcoming ?? []) : [];
  const day = days[dayIndex];
  const maxHours = origin && maxDrive !== "any" ? Number(maxDrive) : null;
  const mine = resorts.filter((r) => onMyPasses(r.passes, myPasses));
  const rank = (i: number) => (forecasts ? rankDay(mine, forecasts, i, origin, maxHours, rankBy) : []);
  const picks = rank(dayIndex);
  const strip = days.map((d, i) => {
    const list = rank(i);
    return { date: d.date, maxIn: list.length ? Math.max(...list.map((p) => p.snowIn)) : null };
  });
  const anySnow = picks.some((p) => p.snowIn >= 0.1);
  // Before the season, say who opens first instead of showing an empty list.
  const firstToOpen =
    day && !mine.some((r) => isOpenOn(r, day.date))
      ? mine.reduce<(typeof mine)[number] | null>(
          (first, r) => (!first || openingDate(r, day.date) < openingDate(first, day.date) ? r : first),
          null,
        )
      : null;

  // Picked resorts stay in the head-to-head even if the filters above hide them from the list.
  const compared = forecasts
    ? compareIds.flatMap((id) => {
        const resort = getResort(id);
        const forecast = forecasts[id];
        const pick = resort && forecast && scoreDay(resort, forecast, dayIndex, origin);
        return pick ? [pick] : [];
      })
    : [];

  const dayName = day ? longDay(day.date, dayIndex) : "";
  const rest = picks.slice(1, showAll ? undefined : 1 + SHORT_LIST);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-10">
        <h1 className="sr-only">Decide where to ski</h1>

        {days.length > 0 && <DayStrip days={strip} value={dayIndex} onChange={setDayIndex} />}

        <section aria-label="Options" className="px-4 pt-4 pb-4">
          <p className="text-[17px] leading-relaxed">
            <Word open={open === "rank"} onClick={() => toggle("rank")}>
              {RANK_BY[rankBy]}
            </Word>{" "}
            from{" "}
            <Word open={open === "from"} onClick={() => toggle("from")}>
              {origin ? origin.label.split(",")[0] : "where?"}
            </Word>
            {origin && (
              <>
                ,{" "}
                <Word open={open === "drive"} onClick={() => toggle("drive")}>
                  {maxDrive === "any" ? "any drive" : `up to ${maxDrive} hr${maxDrive === "1" ? "" : "s"}`}
                </Word>
              </>
            )}
            ,{" "}
            <Word open={open === "pass"} onClick={() => toggle("pass")}>
              {myPasses.length ? myPasses.join(" or ") : "any pass"}
            </Word>
          </p>

          {open && (
            <div className="mt-3 border-l-2 border-ink pl-3">
              {open === "rank" && (
                <TextChoice
                  label="Rank by"
                  value={rankBy}
                  onChange={(v) => {
                    setRankBy(v);
                    setOpen(null);
                  }}
                  options={(Object.keys(RANK_BY) as RankBy[]).map((v) => [v, RANK_BY[v], v === "closest" && !origin])}
                />
              )}
              {open === "from" && <LocationSearch startEditing onLocated={() => setOpen(null)} />}
              {open === "drive" && (
                <TextChoice
                  label="Maximum drive"
                  value={maxDrive}
                  onChange={(v) => {
                    setMaxDrive(v);
                    setOpen(null);
                  }}
                  options={[
                    ["any", "Any drive"],
                    ...(["1", "2", "3", "4"] as const).map((h): [MaxDrive, string] => [h, `Up to ${h} hr${h === "1" ? "" : "s"}`]),
                  ]}
                />
              )}
              {open === "pass" && <PassPicker />}
            </div>
          )}
        </section>

        {forecastState === "error" && <p className="px-4 text-[15px] text-ink-muted">Forecast unavailable right now. Try again in a few minutes.</p>}
        {forecastState === "loading" && <p className="px-4 text-[15px] text-ink-muted">Loading forecast…</p>}

        {forecasts && day && (
          <>
            {picks.length > 0 ? (
              <>
                {!anySnow && (
                  <p className="rule-section px-4 pt-3 text-[15px]">
                    <span className="font-semibold">No new snow {dayName}.</span>
                    {rankBy !== "closest" && origin && " Closest first."}
                  </p>
                )}
                <div className={anySnow ? "rule-section" : ""}>
                  <TopPick pick={picks[0]} dayLabel={dayName} />
                </div>
                {rest.length > 0 && (
                  <ol>
                    {rest.map((p, i) => (
                      <ResultRow key={p.resort.id} pick={p} rank={i + 2} />
                    ))}
                  </ol>
                )}
                {picks.length > 1 + SHORT_LIST && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="rule-row px-4 py-3 text-left text-[14px] font-semibold underline underline-offset-4"
                  >
                    {showAll ? "Show fewer" : `Show all ${picks.length}`}
                  </button>
                )}
              </>
            ) : firstToOpen ? (
              <p className="rule-section px-4 pt-3 text-[15px]">
                <span className="font-semibold">
                  {myPasses.length ? "None of your mountains are" : "No mountains are"} open yet {dayIndex > 1 && "on "}
                  {dayName}.
                </span>
                {firstToOpen.opensOn && ` ${firstToOpen.name} is projected to open first, on ${formatOpening(firstToOpen.opensOn)}.`}
              </p>
            ) : (
              <p className="rule-section px-4 pt-3 text-[15px]">
                No resorts within {maxDrive} hr{maxDrive === "1" ? "" : "s"} on {myPasses.length ? "your passes" : "any pass"}. Try a
                longer drive.
              </p>
            )}

            {compared.length === 1 && <p className="rule-row px-4 py-3 text-[14px] text-ink-muted">Tick one more to compare side by side.</p>}
            {compared.length >= 2 && (
              <div className="mt-4">
                <HeadToHead picks={compared} dayLabel={dayIndex === 0 ? "today" : formatDay(day.date, dayIndex)} />
              </div>
            )}
          </>
        )}

        <p className="mt-6 px-4 text-[11px] text-ink-faint">
          Drive times are estimated from distance, without traffic. Only mountains projected to be open that day are
          ranked. Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>
          .
        </p>
      </main>
    </>
  );
}
