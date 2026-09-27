"use client";

import { useState } from "react";
import SegmentedControl from "@/components/SegmentedControl";
import type { CompareEntry } from "@/components/CompareTable";
import { niceScale } from "@/lib/chart";
import { formatFeet, formatInches } from "@/lib/format";

type Metric = "next7" | "past7" | "depth" | "vertical";

const METRICS: Record<Metric, { label: string; value: (e: CompareEntry) => number | null | undefined; format: (v: number | null) => string; unit: string }> = {
  next7: { label: "Next 7 days", value: (e) => e.forecast?.next7In, format: formatInches, unit: "inches of snowfall forecast" },
  past7: { label: "Last 7 days", value: (e) => e.forecast?.past7In, format: formatInches, unit: "inches of snowfall" },
  depth: { label: "Snow depth", value: (e) => e.forecast?.snowDepthIn, format: formatInches, unit: "inches of modeled snow depth" },
  vertical: { label: "Vertical", value: (e) => e.resort.verticalFt, format: formatFeet, unit: "feet of vertical drop" },
};

export default function CompareChart({ entries }: { entries: CompareEntry[] }) {
  const [metric, setMetric] = useState<Metric>("next7");
  const { value, format, unit, label } = METRICS[metric];
  const values = entries.map((e) => value(e) ?? null);
  const { top, ticks } = niceScale(Math.max(...values.map((v) => v ?? 0), metric === "vertical" ? 1000 : 4));

  return (
    <figure className="rounded-lg border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <figcaption className="font-display text-2xl tracking-wider">{label}</figcaption>
        <SegmentedControl
          label="Chart metric"
          value={metric}
          onChange={setMetric}
          className="w-full sm:w-auto"
          segments={(Object.keys(METRICS) as Metric[]).map((m) => ({ value: m, label: METRICS[m].label }))}
        />
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        {entries.map((entry, i) => {
          const v = values[i];
          const pct = v == null ? 0 : (v / top) * 100;
          return (
            <div key={entry.resort.id} className="contents">
              <div className="flex items-center py-2 text-sm font-semibold">
                <span className="truncate" title={entry.resort.name}>{entry.resort.name}</span>
              </div>
              <div className="py-2 pr-14" title={`${entry.resort.name}: ${format(v)} ${unit}`}>
                <div className="relative h-7">
                  {ticks.map((t) => (
                    <div
                      key={t}
                      aria-hidden="true"
                      className={`absolute -inset-y-2 border-l ${t === 0 ? "border-ink/30" : "border-line"}`}
                      style={{ left: `${(t / top) * 100}%` }}
                    />
                  ))}
                  {v != null && v > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-r bg-glacier transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span
                    className="absolute top-1/2 ml-2 -translate-y-1/2 text-sm font-semibold whitespace-nowrap tabular-nums transition-[left] duration-500"
                    style={{ left: `${pct}%` }}
                  >
                    {format(v)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {/* Axis labels */}
        <div />
        <div className="pr-14">
          <div className="relative mt-1 h-4 text-[11px] text-ink-muted tabular-nums">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / top) * 100}%` }}>
                {metric === "vertical" ? t.toLocaleString("en-US") : `${t}″`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
