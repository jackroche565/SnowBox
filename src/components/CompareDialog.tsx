"use client";

import { useEffect, useRef, type ReactNode } from "react";
import PassTags from "@/components/PassTags";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, formatTemp } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

export type CompareEntry = {
  resort: Resort;
  forecast: ResortForecast | undefined;
  distance: number | null;
};

type Props = {
  open: boolean;
  entries: CompareEntry[];
  onClose: () => void;
  onRemove: (id: string) => void;
};

type Row = {
  label: string;
  hint?: string;
  render: (entry: CompareEntry) => ReactNode;
  /** When set, the highest value in the row is emphasized. */
  rank?: (entry: CompareEntry) => number | null | undefined;
};

const feet = (value: number | undefined) => (value == null ? "—" : `${value.toLocaleString("en-US")} ft`);

const ROWS: Row[] = [
  { label: "Pass", render: ({ resort }) => (resort.passes.length ? <PassTags passes={resort.passes} /> : "—") },
  { label: "Summit", render: ({ resort }) => feet(resort.summitFt) },
  { label: "Vertical", render: ({ resort }) => feet(resort.verticalFt) },
  {
    label: "Distance",
    hint: "Search a location to see distances",
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

export default function CompareDialog({ open, entries, onClose, onRemove }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // A native <dialog> gives us focus trapping, Escape to close and a backdrop for free.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (outside the panel) closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="compare-title"
      className="compare-dialog m-auto w-[calc(100%-1.5rem)] max-w-3xl rounded-lg bg-transparent p-0 text-ink"
    >
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="flex items-center justify-between bg-navy bg-[url(/topo.svg)] bg-cover px-4 py-3 text-snow sm:px-5">
          <h2 id="compare-title" className="font-display text-2xl tracking-wider">
            Compare resorts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-snow/80 hover:bg-white/10 hover:text-snow"
          >
            Close
          </button>
        </div>

        <div className="overflow-x-auto p-3 sm:p-5">
          <table className="w-full table-fixed border-collapse text-sm tabular-nums">
            <colgroup>
              <col className="w-24 sm:w-32" />
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
                    <div className="font-display text-xl leading-none tracking-wide sm:text-2xl">{resort.name}</div>
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
                      <td
                        key={entry.resort.id}
                        className={`px-2 py-2.5 ${i === leader ? "font-bold text-ink" : "text-ink"}`}
                      >
                        {row.render(entry)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-muted">
            Bold values lead the group. Elevations are approximate lift-served figures.
          </p>
        </div>
      </div>
    </dialog>
  );
}
