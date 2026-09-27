import Link from "next/link";
import type { ReactNode } from "react";
import Estimate from "@/components/Estimate";
import PassTags from "@/components/PassTags";
import type { ResortForecast } from "@/lib/forecast";
import { formatFeet, formatInches, formatTemp } from "@/lib/format";
import { isEstimate, resortPath, type Resort } from "@/lib/resorts";

export type CompareEntry = {
  resort: Resort;
  forecast: ResortForecast | undefined;
  distance: number | null;
};

type Row = {
  label: string;
  hint?: string;
  render: (entry: CompareEntry) => ReactNode;
  /** When set, the highest value in the row is emphasized. */
  rank?: (entry: CompareEntry) => number | null | undefined;
};

const feet = (resort: Resort, field: "summitFt" | "baseFt" | "verticalFt") => (
  <>
    {formatFeet(resort[field])}
    {isEstimate(resort, field) && <Estimate />}
  </>
);

const ROWS: Row[] = [
  { label: "Pass", render: ({ resort }) => (resort.passes.length ? <PassTags passes={resort.passes} /> : "—") },
  { label: "Summit", render: ({ resort }) => feet(resort, "summitFt") },
  { label: "Base", render: ({ resort }) => feet(resort, "baseFt") },
  { label: "Vertical", render: ({ resort }) => feet(resort, "verticalFt"), rank: ({ resort }) => resort.verticalFt },
  {
    label: "Trails",
    render: ({ resort }) => (
      <>
        {resort.trails ?? "—"}
        {isEstimate(resort, "trails") && <Estimate />}
      </>
    ),
    rank: ({ resort }) => resort.trails,
  },
  {
    label: "Distance",
    hint: "Search a location on Overview to see distances",
    render: ({ distance }) => (distance == null ? "—" : `${Math.round(distance)} mi`),
  },
  {
    label: "Snow depth",
    hint: "Modeled snow on the ground, not the resort-reported base",
    render: ({ forecast }) => formatInches(forecast?.snowDepthIn),
    rank: ({ forecast }) => forecast?.snowDepthIn,
  },
  {
    label: "Last 7 days",
    render: ({ forecast }) => formatInches(forecast?.past7In),
    rank: ({ forecast }) => forecast?.past7In,
  },
  {
    label: "Next 7 days",
    render: ({ forecast }) => formatInches(forecast?.next7In),
    rank: ({ forecast }) => forecast?.next7In,
  },
  { label: "Now", render: ({ forecast }) => formatTemp(forecast?.tempF) },
];

function leaderIndex(row: Row, entries: CompareEntry[]): number | null {
  if (!row.rank || entries.length < 2) return null;
  const values = entries.map((e) => row.rank!(e) ?? null);
  const max = Math.max(...values.map((v) => v ?? -Infinity));
  // No leader when nothing is known, nothing fell, or it's a tie.
  if (!(max > 0) || values.filter((v) => v === max).length > 1) return null;
  return values.indexOf(max);
}

export default function CompareTable({ entries, onRemove }: { entries: CompareEntry[]; onRemove: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white p-3 sm:p-5">
      <table className="w-full table-fixed border-collapse text-sm tabular-nums">
        <colgroup>
          <col className="w-24 sm:w-36" />
          {entries.map((e) => (
            <col key={e.resort.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Measure
            </th>
            {entries.map(({ resort }) => (
              <th key={resort.id} scope="col" className="px-2 pb-3 text-left align-top font-normal">
                <Link
                  href={resortPath(resort.id)}
                  className="font-display text-xl leading-none tracking-wide hover:text-glacier sm:text-2xl"
                >
                  {resort.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                  {resort.state}
                  <button
                    type="button"
                    onClick={() => onRemove(resort.id)}
                    aria-label={`Remove ${resort.name} from compare`}
                    className="rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-muted hover:border-barn hover:text-barn"
                  >
                    Remove
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const leader = leaderIndex(row, entries);
            return (
              <tr key={row.label} className="border-t border-line">
                <th scope="row" className="py-2.5 pr-2 text-left text-xs font-medium text-ink-muted" title={row.hint}>
                  {row.label}
                  {row.hint && <span className="ml-0.5 cursor-help">ⓘ</span>}
                </th>
                {entries.map((entry, i) => (
                  <td key={entry.resort.id} className={`px-2 py-2.5 text-ink ${i === leader ? "font-bold" : ""}`}>
                    {row.render(entry)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-muted">
        Bold values lead the group. Figures marked <span className="font-medium">est.</span> are estimates or
        disagree between published sources.
      </p>
    </div>
  );
}
