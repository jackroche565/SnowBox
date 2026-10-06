import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import type { Resort } from "@/lib/resorts";

// A made-up storm for trying Decide out of season. Real temperatures and wind, invented snow:
// heavier up north and up high, a little rain in the south, strong gusts on the tallest peaks.
// Dates move to mid-January so every mountain counts as open. Never shown without a "demo" label.

/** The demo week starts on this day (a Tuesday in the 2026-27 season). */
const DEMO_START = "2027-01-12";

/** How much of the storm each day gets, today (Tuesday) first: building Thursday, peaking Saturday, done by Monday. */
const STORM_SHAPE = [0, 0.05, 0.15, 0.55, 1, 0.3, 0];
/** The demo opens on the storm's biggest day. */
export const DEMO_PEAK_DAY = STORM_SHAPE.indexOf(1);
/** Peak-day snow at the snowiest mountains, in inches. */
const PEAK_INCHES = 12;

const DAY_MS = 24 * 3600 * 1000;

function shiftDate(date: string, offsetDays: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** 0 in southern Connecticut, 1 in northern Vermont and Maine. */
const northness = (lat: number) => Math.min(1, Math.max(0, (lat - 41.3) / 3.6));

function demoDay(resort: Resort, day: DailyForecast, i: number, offset: number): DailyForecast {
  const north = northness(resort.lat);
  const high = Math.min(1, (resort.summitFt ?? 1500) / 4000);
  const shape = STORM_SHAPE[i] ?? 0;
  const snow = Math.round(PEAK_INCHES * shape * (0.25 + 0.55 * north + 0.2 * high) * 10) / 10;
  // The storm's warm side: rain where it's furthest south, on the busiest days.
  const rain = north < 0.25 && shape >= 0.55 ? 0.3 : 0;
  // The biggest summits get hold-worthy gusts on the peak day.
  const gust = shape === 1 && (resort.summitFt ?? 0) >= 3800 ? 46 : day.gustMph;
  return { ...day, date: shiftDate(day.date, offset), snowIn: rain ? snow * 0.3 : snow, rainIn: rain, gustMph: gust };
}

const total = (days: DailyForecast[]) => days.reduce((t, d) => t + (d.snowIn ?? 0), 0);

/** Every resort's forecast with the sample storm in place of the real snow. */
export function demoForecasts(real: Record<string, ResortForecast>, list: Resort[]): Record<string, ResortForecast> {
  const out: Record<string, ResortForecast> = {};
  for (const resort of list) {
    const f = real[resort.id];
    const first = f?.outlook[0]?.date;
    if (!f || !first) continue;
    const offset = Math.round((Date.parse(`${DEMO_START}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / DAY_MS);
    const outlook = f.outlook.map((d, i) => demoDay(resort, d, i, offset));
    // A dusting two days before the storm, so "the 2 days before" has something to count.
    const past = f.past.map((d, i, all) => ({
      ...d,
      date: shiftDate(d.date, offset),
      snowIn: i === all.length - 2 ? Math.round(3 * northness(resort.lat) * 10) / 10 : 0,
      rainIn: 0,
    }));
    out[resort.id] = {
      ...f,
      outlook,
      upcoming: outlook.slice(0, 7),
      past,
      past7In: total(past),
      todayIn: total(outlook.slice(0, 1)),
      next3In: total(outlook.slice(0, 3)),
      next7In: total(outlook.slice(0, 7)),
      days8to16In: total(outlook.slice(7)),
    };
  }
  return out;
}
