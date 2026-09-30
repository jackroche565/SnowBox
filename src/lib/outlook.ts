import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import { formatInches } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

// Region-wide reads of the forecast for the Home screen. Everything here is arithmetic on
// model output; the wording states numbers, it never pretends to be a human forecaster.

export type Window = "next3" | "next7" | "days8to16";

export const WINDOWS: Record<Window, { label: string; short: string; value: (f: ResortForecast) => number }> = {
  next3: { label: "Next 3 days", short: "3 days", value: (f) => f.next3In },
  next7: { label: "Next 7 days", short: "7 days", value: (f) => f.next7In },
  days8to16: { label: "Days 8–16", short: "8–16 days", value: (f) => f.days8to16In },
};

/** A day with this much new snow reads as a powder day in the Northeast. */
export const POWDER_INCHES = 6;
/** Below this, a total is a dusting rather than skiable new snow. */
const MEASURABLE_INCHES = 1;

export type Ranked = { resort: Resort; forecast: ResortForecast; value: number };

export function rank(
  list: Resort[],
  forecasts: Record<string, ResortForecast>,
  window: Window,
): Ranked[] {
  return list
    .flatMap((resort) => {
      const forecast = forecasts[resort.id];
      return forecast ? [{ resort, forecast, value: WINDOWS[window].value(forecast) }] : [];
    })
    .sort((a, b) => b.value - a.value || a.resort.name.localeCompare(b.resort.name));
}

export type Headline = {
  tone: "storm" | "snow" | "long-range" | "quiet";
  title: string;
  detail: string;
};

export function regionHeadline(list: Resort[], forecasts: Record<string, ResortForecast>): Headline {
  const week = rank(list, forecasts, "next7");
  const leader = week[0];
  const withSnow = week.filter((r) => r.value >= MEASURABLE_INCHES).length;

  if (leader && leader.value >= POWDER_INCHES) {
    const big = week.filter((r) => r.value >= 3).length;
    return {
      tone: "storm",
      title: "Storm Watch",
      detail: `${leader.resort.name} leads with ${formatInches(leader.value)} over the next 7 days. ${big} ${big === 1 ? "resort expects" : "resorts expect"} 3" or more.`,
    };
  }
  if (leader && leader.value >= MEASURABLE_INCHES) {
    return {
      tone: "snow",
      title: "Snow in the Forecast",
      detail: `${withSnow} ${withSnow === 1 ? "resort sees" : "resorts see"} measurable snow this week, led by ${leader.resort.name} at ${formatInches(leader.value)}.`,
    };
  }
  const late = rank(list, forecasts, "days8to16")[0];
  if (late && late.value >= MEASURABLE_INCHES) {
    return {
      tone: "long-range",
      title: "Watching Week Two",
      detail: `Dry for the next 7 days. Long-range models hint at ${formatInches(late.value)} for ${late.resort.name} in days 8–16. Low confidence this far out.`,
    };
  }
  return {
    tone: "quiet",
    title: "Waiting on Winter",
    detail: `No meaningful snow in the 16-day outlook for any of the ${list.length} resorts we track.`,
  };
}

/** The first day in the next 7 with a powder-sized snowfall, if any. */
export function nextPowderDay(forecast: ResortForecast): { day: DailyForecast; index: number } | null {
  const index = forecast.upcoming.findIndex((d) => (d.snowIn ?? 0) >= POWDER_INCHES);
  return index === -1 ? null : { day: forecast.upcoming[index], index };
}

export type WinterSign = { label: string; resort: Resort; date: string; value: string };

/**
 * Early-season signals when nothing is falling yet: the first freezing night, the
 * coldest night, and the first flakes anywhere in the 16-day outlook.
 */
export function winterSigns(list: Resort[], forecasts: Record<string, ResortForecast>): WinterSign[] {
  let firstFreeze: WinterSign | null = null;
  let coldest: (WinterSign & { lowF: number }) | null = null;
  let firstFlakes: WinterSign | null = null;

  for (const resort of list) {
    for (const day of forecasts[resort.id]?.outlook ?? []) {
      if (day.lowF != null && day.lowF <= 32 && (!firstFreeze || day.date < firstFreeze.date)) {
        firstFreeze = { label: "First freezing night", resort, date: day.date, value: `${Math.round(day.lowF)}°` };
      }
      if (day.lowF != null && (!coldest || day.lowF < coldest.lowF)) {
        coldest = { label: "Coldest night ahead", resort, date: day.date, value: `${Math.round(day.lowF)}°`, lowF: day.lowF };
      }
      if ((day.snowIn ?? 0) >= 0.1 && (!firstFlakes || day.date < firstFlakes.date)) {
        firstFlakes = { label: "First flakes", resort, date: day.date, value: formatInches(day.snowIn) };
      }
    }
  }
  return [firstFlakes, firstFreeze, coldest].filter((s): s is WinterSign => s !== null);
}
