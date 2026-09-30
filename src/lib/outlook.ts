import type { ResortForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatShortDate } from "@/lib/format";

/** A day with this much new snow is a powder day in the Northeast. */
export const POWDER_INCHES = 6;
/** Less than this is a dusting, not skiable new snow. */
const MEASURABLE_INCHES = 0.5;

export type SnowNote = { text: string; tone: "powder" | "snow" | "none" };

/** One short line on what's coming for a resort: the next powder day, the next snow, or nothing. */
export function snowNote(forecast: ResortForecast): SnowNote {
  const label = (date: string, i: number) => (i < 7 ? formatDay(date, i) : formatShortDate(date));

  const powder = forecast.upcoming.findIndex((d) => (d.snowIn ?? 0) >= POWDER_INCHES);
  if (powder !== -1) {
    const d = forecast.upcoming[powder];
    return { text: `Powder ${label(d.date, powder)} · ${formatInches(d.snowIn)}`, tone: "powder" };
  }
  const next = forecast.outlook.findIndex((d) => (d.snowIn ?? 0) >= MEASURABLE_INCHES);
  if (next !== -1) {
    const d = forecast.outlook[next];
    return { text: `Next snow ${label(d.date, next)} · ${formatInches(d.snowIn)}`, tone: "snow" };
  }
  const light = forecast.outlook.findIndex((d) => (d.snowIn ?? 0) >= 0.1);
  if (light !== -1) return { text: `Flurries ${label(forecast.outlook[light].date, light)}`, tone: "none" };
  return { text: "No snow in 16 days", tone: "none" };
}
