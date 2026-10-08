import type { ResortForecast } from "@/lib/forecast";
import { formatDay, formatInches, formatShortDate } from "@/lib/format";

/** A day with this much new snow is a powder day in the Northeast. */
export const POWDER_INCHES = 6;
/** Less than this is a dusting, not skiable new snow. */
const MEASURABLE_INCHES = 0.5;

export type SnowNote = { text: string; tone: "powder" | "snow" | "none" };

/** Snow over the last two days, today excluded (today is still a forecast). */
export function last48In(forecast: ResortForecast): number {
  return forecast.past.slice(-2).reduce((t, d) => t + (d.snowIn ?? 0), 0);
}

/** One short line on a resort: fresh snow on the ground, the next powder day, the next snow, or nothing. */
export function snowNote(forecast: ResortForecast): SnowNote {
  const label = (date: string, i: number) => (i < 7 ? formatDay(date, i) : formatShortDate(date));

  const fresh = last48In(forecast);
  if (fresh >= 1) {
    return { text: `Fresh ${formatInches(fresh)} last 48 hrs`, tone: fresh >= POWDER_INCHES ? "powder" : "snow" };
  }
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
  // Usually 16 days; only the next 7 if the long-range part of the forecast couldn't be fetched.
  return { text: `No snow in ${forecast.outlook.length} days`, tone: "none" };
}
