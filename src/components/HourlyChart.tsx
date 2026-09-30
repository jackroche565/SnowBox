"use client";

import { useState } from "react";
import { WindIcon } from "@/components/Icons";
import { PRECIP_COLORS, formatHour, formatInches, formatTemp } from "@/lib/format";
import { WIND_HOLD_MPH, type Block, type PrecipKind } from "@/lib/resortForecast";

const BAR_HEIGHT_PX = 96;
const TEMP_HEIGHT_PX = 64;
// A trace of snow shouldn't fill the chart.
const MIN_SCALE_INCHES = 2;

const KIND_LABEL: Record<PrecipKind, string> = { none: "Dry", snow: "Snow", mix: "Mix", rain: "Rain" };

function dayLabel(time: string, index: number): string | null {
  if (index === 0) return "Now";
  // The first block of each new day (blocks start on the hour, 3 hours apart).
  if (Number(time.slice(11, 13)) < 3) {
    return new Date(`${time.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
  }
  return null;
}

/** Hour-by-hour (in 3-hour blocks) snow, precipitation type, temperature and wind for one elevation. */
export default function HourlyChart({ blocks }: { blocks: Block[] }) {
  const [active, setActive] = useState<number | null>(null);
  const columns = { gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` };
  const snowMax = Math.max(MIN_SCALE_INCHES, ...blocks.map((b) => b.snowIn));
  const anySnow = blocks.some((b) => b.snowIn > 0.01);

  // The temperature line always shows the freezing mark so you can see which side of it you're on.
  const temps = blocks.map((b) => b.tempF).filter((t): t is number => t != null);
  const tMin = Math.min(30, ...temps) - 2;
  const tMax = Math.max(34, ...temps) + 2;
  const y = (t: number) => ((tMax - t) / (tMax - tMin)) * 100;
  const x = (i: number) => ((i + 0.5) / blocks.length) * 100;
  const points = blocks.flatMap((b, i) => (b.tempF == null ? [] : [`${x(i)},${y(b.tempF)}`])).join(" ");
  const activeBlock = active === null ? null : blocks[active];

  return (
    <figure className="relative" onMouseLeave={() => setActive(null)}>
      {/* Snowfall bars. With no snow at all they'd be an empty box, so the row shrinks to a note. */}
      {!anySnow && (
        <p className="pb-1 text-xs text-ink-muted">No snow in the next 72 hours at this elevation.</p>
      )}
      <div
        className="relative grid border-b border-ink/30"
        style={{ ...columns, height: anySnow ? BAR_HEIGHT_PX : 16 }}
      >
        {blocks.map((b, i) => (
          <button
            type="button"
            key={b.start}
            aria-label={`${formatHour(b.start)}: ${KIND_LABEL[b.kind]}, ${formatInches(b.snowIn)} snow, ${formatTemp(b.tempF)}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            className={`relative flex h-full items-end justify-center ${active === i ? "bg-glacier/10" : ""} ${
              i > 0 && dayLabel(b.start, i) ? "border-l border-line" : ""
            }`}
          >
            {b.snowIn > 0.01 && (
              <span
                className="block w-[70%] rounded-t-sm"
                style={{
                  height: `max(${(b.snowIn / snowMax) * 100}%, 2px)`,
                  backgroundColor: active === i ? "var(--navy)" : PRECIP_COLORS.snow,
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Precipitation type strip */}
      <div className="mt-1 grid gap-px" style={columns} aria-hidden="true">
        {blocks.map((b) => (
          <span
            key={b.start}
            className="h-1.5 rounded-[1px]"
            style={{ backgroundColor: b.kind === "none" ? "var(--line)" : PRECIP_COLORS[b.kind], opacity: b.kind === "none" ? 0.5 : 1 }}
          />
        ))}
      </div>

      {/* Temperature line with the freezing mark */}
      <div className="relative mt-2" style={{ height: TEMP_HEIGHT_PX }} aria-hidden="true">
        <div className="absolute inset-x-0 border-t border-dashed border-glacier" style={{ top: `${y(32)}%` }}>
          <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] leading-none font-semibold text-glacier">32°</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <polyline points={points} fill="none" stroke="var(--alpenglow)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {activeBlock?.tempF != null && active !== null && (
          <span
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-alpenglow"
            style={{ left: `${x(active)}%`, top: `${y(activeBlock.tempF)}%` }}
          />
        )}
      </div>

      {/* Wind hold warnings */}
      <div className="mt-1 grid" style={columns} aria-hidden="true">
        {blocks.map((b) => (
          <span key={b.start} className="flex h-4 justify-center">
            {b.gustMph != null && b.gustMph >= WIND_HOLD_MPH && <WindIcon className="h-3.5 w-3.5 text-barn" />}
          </span>
        ))}
      </div>

      {/* Day labels */}
      <div className="relative mt-1 h-4 text-[11px] font-medium text-ink-muted">
        {blocks.map((b, i) => {
          const label = dayLabel(b.start, i);
          return (
            label && (
              <span key={b.start} className="absolute whitespace-nowrap" style={{ left: `${(i / blocks.length) * 100}%` }}>
                {label}
              </span>
            )
          );
        })}
      </div>

      {activeBlock && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-md bg-navy px-3 py-2 text-xs text-snow shadow-lg"
          style={{ left: `clamp(5rem, ${x(active)}%, calc(100% - 5rem))` }}
        >
          <div className="font-semibold">
            {new Date(`${activeBlock.start.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}{" "}
            {formatHour(activeBlock.start)}, next 3 h
          </div>
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="text-snow/70">{KIND_LABEL[activeBlock.kind]}</span>
            {activeBlock.kind === "snow" || activeBlock.kind === "mix"
              ? formatInches(activeBlock.snowIn)
              : activeBlock.kind === "rain"
                ? `${activeBlock.precipIn.toFixed(2)}" rain`
                : "—"}
          </div>
          <div className="flex justify-between tabular-nums">
            <span className="text-snow/70">Temp</span>
            {formatTemp(activeBlock.tempF)}
          </div>
          <div className="flex justify-between tabular-nums">
            <span className="text-snow/70">Gusts</span>
            {activeBlock.gustMph == null ? "—" : `${Math.round(activeBlock.gustMph)} mph`}
          </div>
        </div>
      )}
    </figure>
  );
}

export function HourlyLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
      {(["snow", "mix", "rain"] as const).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-[1px]" style={{ backgroundColor: PRECIP_COLORS[k] }} />
          {KIND_LABEL[k]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 bg-alpenglow" />
        Temperature
      </li>
      <li className="flex items-center gap-1.5">
        <WindIcon className="h-3.5 w-3.5 text-barn" />
        Gusts {WIND_HOLD_MPH}+ mph (lift holds possible)
      </li>
    </ul>
  );
}
