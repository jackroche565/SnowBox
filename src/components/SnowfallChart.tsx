"use client";

import { useState } from "react";
import type { DailyForecast } from "@/lib/forecast";
import { niceScale } from "@/lib/chart";
import { formatDay, formatInches, formatTemp } from "@/lib/format";

// A dusting shouldn't fill the chart, so the axis always reaches at least this far.
const MIN_AXIS_INCHES = 4;
const PLOT_HEIGHT_PX = 180;

export type ChartDay = DailyForecast & {
  /** Lowest and highest snowfall across weather models, when known. */
  rangeLowIn?: number | null;
  rangeHighIn?: number | null;
};

type Props = {
  days: ChartDay[];
  /** Days from this index on are shaded as long range. */
  longRangeFrom?: number;
};

export default function SnowfallChart({ days, longRangeFrom }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(MIN_AXIS_INCHES, ...days.map((d) => Math.max(d.snowIn ?? 0, d.rangeHighIn ?? 0)));
  const { top, ticks } = niceScale(max);
  const activeDay = active === null ? null : days[active];
  const dense = days.length > 10;
  const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };
  const hasLongRange = longRangeFrom !== undefined && longRangeFrom < days.length;

  return (
    <figure>
      {/* Top padding keeps the highest axis label and bar values clear of the card title. */}
      <div className="flex gap-2 pt-5">
        {/* Y axis */}
        <div className="relative w-7 shrink-0 text-right text-[11px] text-ink-muted tabular-nums" style={{ height: PLOT_HEIGHT_PX }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {t}&Prime;
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Long-range shading */}
          {hasLongRange && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(16_24_38/0.035)_6px_12px)]"
              style={{ left: `${(longRangeFrom / days.length) * 100}%`, height: PLOT_HEIGHT_PX }}
            >
              <span className="absolute top-1 left-1.5 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                Long range
              </span>
            </div>
          )}

          {/* Gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: PLOT_HEIGHT_PX }}>
            {ticks.map((t) => (
              <div
                key={t}
                className={`absolute inset-x-0 border-t ${t === 0 ? "border-ink/30" : "border-line"}`}
                style={{ bottom: `${(t / top) * 100}%` }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="relative grid" style={{ ...columns, height: PLOT_HEIGHT_PX }} onMouseLeave={() => setActive(null)}>
            {days.map((day, i) => {
              const snow = day.snowIn ?? 0;
              const pct = (snow / top) * 100;
              // The whisker always spans the bar, so a model range never looks like it excludes the forecast.
              const low = Math.min(day.rangeLowIn ?? snow, snow);
              const high = Math.max(day.rangeHighIn ?? snow, snow);
              const showRange = day.rangeHighIn != null && high - low >= 0.2;
              const longRange = hasLongRange && i >= longRangeFrom;
              return (
                <div
                  key={day.date}
                  className="relative flex h-full cursor-default items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  {showRange && (
                    <div
                      aria-hidden="true"
                      className="absolute left-1/2 w-px -translate-x-1/2 bg-ink/40 before:absolute before:-left-1 before:top-0 before:h-px before:w-[9px] before:bg-ink/40 after:absolute after:-left-1 after:bottom-0 after:h-px after:w-[9px] after:bg-ink/40"
                      style={{ bottom: `${(low / top) * 100}%`, height: `${((high - low) / top) * 100}%` }}
                    />
                  )}
                  {snow > 0 && (
                    <div
                      className={`relative rounded-t transition-colors ${dense ? "w-[60%]" : "w-[46%]"} max-w-10 ${
                        active === i ? "bg-navy" : longRange ? "bg-glacier/55" : "bg-glacier"
                      }`}
                      style={{ height: `max(${pct}%, 3px)` }}
                    />
                  )}
                  {/* The value sits above the bar or the whisker, whichever is taller. */}
                  {snow > 0 && (!dense || snow >= 1) && (
                    <span
                      className={`absolute inset-x-0 text-center font-semibold whitespace-nowrap text-ink tabular-nums ${dense ? "text-[10px]" : "text-xs"}`}
                      style={{ bottom: `calc(${((showRange ? high : snow) / top) * 100}% + 3px)` }}
                    >
                      {formatInches(day.snowIn)}
                    </span>
                  )}
                </div>
              );
            })}

            {activeDay && active !== null && (
              <div
                role="status"
                className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-md bg-navy px-3 py-2 text-xs text-snow shadow-lg"
                style={{ left: `clamp(5rem, ${((active + 0.5) / days.length) * 100}%, calc(100% - 5rem))` }}
              >
                <div className="font-semibold">
                  {new Date(`${activeDay.date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="mt-1 flex justify-between tabular-nums">
                  <span className="text-snow/70">Snow</span>
                  {formatInches(activeDay.snowIn)}
                </div>
                {activeDay.rangeHighIn != null && (
                  <div className="flex justify-between tabular-nums">
                    <span className="text-snow/70">Model range</span>
                    {formatInches(Math.min(activeDay.rangeLowIn ?? 0, activeDay.snowIn ?? 0))}–
                    {formatInches(Math.max(activeDay.rangeHighIn, activeDay.snowIn ?? 0))}
                  </div>
                )}
                <div className="flex justify-between tabular-nums">
                  <span className="text-snow/70">High / low</span>
                  {formatTemp(activeDay.highF)} / {formatTemp(activeDay.lowF)}
                </div>
              </div>
            )}
          </div>

          {/* X axis */}
          <div className="mt-2 grid text-center tabular-nums" style={columns}>
            {days.map((day, i) => (
              <div key={day.date} className="min-w-0">
                {/* Dense charts use two-letter weekdays; today is marked by weight instead of the word. */}
                <div
                  className={`truncate ${dense ? "text-[10px]" : "text-xs"} ${active === i || (dense && i === 0) ? "text-ink" : "text-ink-muted"} ${dense && i === 0 ? "font-bold" : "font-medium"}`}
                >
                  {dense ? formatDay(day.date, -1).slice(0, 2) : formatDay(day.date, i)}
                </div>
                {dense ? (
                  <div className="text-[10px] text-ink-muted">{Number(day.date.slice(8))}</div>
                ) : (
                  <div className="text-[11px] text-ink-muted">
                    {formatTemp(day.highF)}
                    <span className="text-line"> / </span>
                    {formatTemp(day.lowF)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">Daily snowfall forecast in inches for the next {days.length} days</figcaption>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Day</th>
            <th>Snowfall</th>
            <th>Model range</th>
            <th>High</th>
            <th>Low</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => (
            <tr key={day.date}>
              <td>{formatDay(day.date, i)}</td>
              <td>{formatInches(day.snowIn)}</td>
              <td>
                {day.rangeHighIn != null ? `${formatInches(day.rangeLowIn)} to ${formatInches(day.rangeHighIn)}` : "—"}
              </td>
              <td>{formatTemp(day.highF)}</td>
              <td>{formatTemp(day.lowF)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
