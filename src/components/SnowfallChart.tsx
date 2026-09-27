"use client";

import { useState } from "react";
import type { DailyForecast } from "@/lib/forecast";
import { niceScale } from "@/lib/chart";
import { formatDay, formatInches, formatTemp } from "@/lib/format";

// A dusting shouldn't fill the chart, so the axis always reaches at least this far.
const MIN_AXIS_INCHES = 4;
const PLOT_HEIGHT_PX = 180;

export default function SnowfallChart({ days }: { days: DailyForecast[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(MIN_AXIS_INCHES, ...days.map((d) => d.snowIn ?? 0));
  const { top, ticks } = niceScale(max);
  const activeDay = active === null ? null : days[active];

  return (
    <figure>
      {/* Top padding keeps the highest axis label and bar values clear of the card title. */}
      <div className="flex gap-2 pt-5">
        {/* Y axis */}
        <div className="relative w-8 shrink-0 text-right text-[11px] text-ink-muted tabular-nums" style={{ height: PLOT_HEIGHT_PX }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {t}&Prime;
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
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
          <div className="relative grid grid-cols-7" style={{ height: PLOT_HEIGHT_PX }} onMouseLeave={() => setActive(null)}>
            {days.map((day, i) => {
              const snow = day.snowIn ?? 0;
              const pct = (snow / top) * 100;
              return (
                <div
                  key={day.date}
                  className="relative flex h-full cursor-default items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                >
                  {snow > 0 && (
                    <div
                      className={`relative w-[46%] max-w-10 rounded-t transition-colors ${active === i ? "bg-navy" : "bg-glacier"}`}
                      style={{ height: `max(${pct}%, 3px)` }}
                    >
                      <span className="absolute inset-x-0 -top-5 text-center text-xs font-semibold whitespace-nowrap text-ink tabular-nums">
                        {formatInches(day.snowIn)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {activeDay && active !== null && (
              <div
                role="status"
                className="pointer-events-none absolute top-0 z-10 w-36 -translate-x-1/2 rounded-md bg-navy px-3 py-2 text-xs text-snow shadow-lg"
                style={{ left: `clamp(4.5rem, ${((active + 0.5) / days.length) * 100}%, calc(100% - 4.5rem))` }}
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
                <div className="flex justify-between tabular-nums">
                  <span className="text-snow/70">High / low</span>
                  {formatTemp(activeDay.highF)} / {formatTemp(activeDay.lowF)}
                </div>
              </div>
            )}
          </div>

          {/* X axis */}
          <div className="mt-2 grid grid-cols-7 text-center tabular-nums">
            {days.map((day, i) => (
              <div key={day.date}>
                <div className={`text-xs font-medium ${active === i ? "text-ink" : "text-ink-muted"}`}>{formatDay(day.date, i)}</div>
                <div className="text-[11px] text-ink-muted">
                  {formatTemp(day.highF)}
                  <span className="text-line"> / </span>
                  {formatTemp(day.lowF)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">Daily snowfall forecast in inches for the next 7 days</figcaption>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Day</th>
            <th>Snowfall</th>
            <th>High</th>
            <th>Low</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => (
            <tr key={day.date}>
              <td>{formatDay(day.date, i)}</td>
              <td>{formatInches(day.snowIn)}</td>
              <td>{formatTemp(day.highF)}</td>
              <td>{formatTemp(day.lowF)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
