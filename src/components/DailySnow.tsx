import type { DailyForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatTemp } from "@/lib/format";

// Bars share a floor so a dusting doesn't look like a dump.
const MIN_SCALE_INCHES = 6;
const BAR_AREA_PX = 44;

/** Compact snow strip. `past` labels every day by weekday instead of starting at "Today". */
export default function DailySnow({ days, past = false }: { days: DailyForecast[]; past?: boolean }) {
  const label = (date: string, i: number) => formatDay(date, past ? -1 : i);
  const max = Math.max(MIN_SCALE_INCHES, ...days.map((d) => d.snowIn ?? 0));
  return (
    <ol className="grid grid-cols-7 gap-1 text-center tabular-nums" aria-label={past ? "Daily snowfall, last 7 days" : "Daily snowfall forecast"}>
      {days.map((day, i) => {
        const snow = day.snowIn ?? 0;
        const height = snow > 0 ? Math.max(2, (snow / max) * BAR_AREA_PX) : 0;
        return (
          <li
            key={day.date}
            aria-label={`${label(day.date, i)}: ${formatInches(day.snowIn)} snow, high ${formatTemp(day.highF)}, low ${formatTemp(day.lowF)}`}
          >
            <div className="text-xs font-semibold text-ink">{formatInches(day.snowIn)}</div>
            <div className="mt-1 flex items-end justify-center border-b border-line" style={{ height: BAR_AREA_PX }}>
              {height > 0 && (
                <div className="w-3 rounded-t bg-glacier sm:w-4" style={{ height }} />
              )}
            </div>
            <div className="mt-1.5 text-xs font-medium text-ink">{label(day.date, i)}</div>
            <div className="text-[11px] text-ink-muted">
              {formatTemp(day.highF)}
              <span className="text-line"> / </span>
              {formatTemp(day.lowF)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
