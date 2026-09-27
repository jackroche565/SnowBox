import type { Ref } from "react";
import type { ResortForecast } from "@/lib/forecast";
import { PASS_COLORS, formatDay, formatInches, formatTemp } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

type Props = {
  ref?: Ref<HTMLLIElement>;
  resort: Resort;
  forecast: ResortForecast | undefined;
  forecastState: "loading" | "error" | "ready";
  distance: number | null;
  selected: boolean;
  onSelect: () => void;
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500" title={hint}>
        {label}
        {hint && <span className="ml-0.5 cursor-help">ⓘ</span>}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function ResortCard({ ref, resort, forecast, forecastState, distance, selected, onSelect }: Props) {
  return (
    <li ref={ref} className="scroll-mt-4">
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className={`w-full rounded-lg border bg-white p-4 text-left transition-colors hover:border-zinc-400 ${
          selected ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">
              {resort.name} <span className="font-normal text-zinc-500">{resort.state}</span>
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {resort.passes.map((pass) => (
                <span
                  key={pass}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: PASS_COLORS[pass] }}
                >
                  {pass}
                </span>
              ))}
            </div>
          </div>
          {distance !== null && (
            <span className="shrink-0 text-sm text-zinc-500 tabular-nums">{Math.round(distance)} mi</span>
          )}
        </div>

        {forecastState === "loading" && <p className="mt-3 text-sm text-zinc-500">Loading forecast…</p>}
        {forecastState === "error" && <p className="mt-3 text-sm text-zinc-500">Forecast unavailable</p>}
        {forecast && (
          <>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Stat label="Last 7 days" value={formatInches(forecast.past7In)} />
              <Stat label="Next 7 days" value={formatInches(forecast.next7In)} />
              <Stat
                label="Snow depth"
                value={formatInches(forecast.snowDepthIn)}
                hint="Modeled snow on the ground from Open-Meteo, not the resort's reported base depth."
              />
              <Stat label="Now" value={formatTemp(forecast.tempF)} />
            </div>

            {selected && (
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <div className="mb-2 text-xs text-zinc-500">Daily forecast</div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {forecast.upcoming.map((day, i) => (
                    <div key={day.date} className="rounded bg-zinc-50 px-1 py-2">
                      <div className="font-medium">{formatDay(day.date, i)}</div>
                      <div className="mt-1 text-sm font-semibold tabular-nums">{formatInches(day.snowIn)}</div>
                      <div className="mt-1 tabular-nums">{formatTemp(day.highF)}</div>
                      <div className="text-zinc-500 tabular-nums">{formatTemp(day.lowF)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </button>
    </li>
  );
}
