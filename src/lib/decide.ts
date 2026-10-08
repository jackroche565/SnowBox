import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import { formatInches } from "@/lib/format";
import type { LatLon } from "@/lib/geo";
import { distanceMiles } from "@/lib/geo";
import type { Resort } from "@/lib/resorts";
import { WIND_HOLD_MPH } from "@/lib/resortForecast";
import { isOpenOn } from "@/lib/season";

// Ranks resorts for one day. Every weight is here in plain sight so it's easy to tune,
// and the page shows the raw numbers next to every rank.

/** Roads wind; straight-line miles are multiplied by this to approximate road miles. */
const ROAD_FACTOR = 1.25;
/** Average speed for an estimated drive, mixing highway and mountain roads. Typical drives
 *  from Boston to Loon, Stratton, Killington, Sunday River and Sugarloaf come out within about half an hour. */
const AVERAGE_MPH = 55;

/** Score points per inch of new snow on the day. */
const SNOW_WEIGHT = 1;
/** Snow in the 48 hours before still skis fresh, at half value. */
const PRIOR_SNOW_WEIGHT = 0.5;
/** An inch of rain ruins a day, so rain counts heavily against. */
const RAIN_WEIGHT = 6;
const WIND_PENALTY = 3;
/** Each hour of estimated driving costs this many points. */
const DRIVE_WEIGHT = 1;

/** Past this, a drive estimate means nothing (you'd fly), so pages don't show one. */
export const MAX_SHOWN_DRIVE_HOURS = 12;

export const isDrivable = (hours: number | null | undefined): hours is number => hours != null && hours <= MAX_SHOWN_DRIVE_HOURS;

export function estimateDriveHours(from: LatLon, to: LatLon): number {
  return (distanceMiles(from, to) * ROAD_FACTOR) / AVERAGE_MPH;
}

/** "~2h 50m" */
export function formatDrive(hours: number): string {
  const total = Math.max(5, Math.round((hours * 60) / 5) * 5);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `~${h ? `${h}h` : ""}${h && m ? " " : ""}${m ? `${m}m` : ""}`;
}

export type Reason = { text: string; tone: "good" | "bad" };

export type Pick = {
  resort: Resort;
  day: DailyForecast;
  snowIn: number;
  /** Snow over the two days before the chosen day. */
  priorIn: number;
  rainIn: number;
  gustMph: number | null;
  /** Whether the mountain is expected to be open that day (see season.ts). */
  open: boolean;
  driveHours: number | null;
  score: number;
  reasons: Reason[];
};

/** Scores a resort for one date (YYYY-MM-DD). By date, not position: mountains in a region can sit in
 *  different time zones, so near midnight one's "today" is another's "tomorrow". */
export function scoreDay(resort: Resort, forecast: ResortForecast, date: string, origin: LatLon | null): Pick | null {
  // One timeline of past and upcoming days, so "the 48 hours before" works for today too.
  const timeline = [...forecast.past, ...forecast.outlook];
  const at = timeline.findIndex((d) => d.date === date);
  if (at === -1) return null;
  const day = timeline[at];

  const snowIn = day.snowIn ?? 0;
  const priorIn = timeline.slice(Math.max(0, at - 2), at).reduce((t, d) => t + (d.snowIn ?? 0), 0);
  const rainIn = day.rainIn ?? 0;
  const gustMph = day.gustMph;
  const open = isOpenOn(resort, day.date);
  // Wind only matters once lifts are running.
  const windy = open && gustMph != null && gustMph >= WIND_HOLD_MPH;
  const driveHours = origin ? estimateDriveHours(origin, resort) : null;

  const score =
    snowIn * SNOW_WEIGHT +
    priorIn * PRIOR_SNOW_WEIGHT -
    rainIn * RAIN_WEIGHT -
    (windy ? WIND_PENALTY : 0) -
    (driveHours ?? 0) * DRIVE_WEIGHT;

  const reasons: Reason[] = [];
  if (priorIn >= 1) reasons.push({ text: `${formatInches(priorIn)} in the 2 days before`, tone: "good" });
  if (rainIn >= 0.05) reasons.push({ text: `${rainIn.toFixed(2)}" rain`, tone: "bad" });
  if (windy) reasons.push({ text: `Gusts ${Math.round(gustMph)} mph, lift holds possible`, tone: "bad" });

  return { resort, day, snowIn, priorIn, rainIn, gustMph, open, driveHours, score, reasons };
}

export type RankBy = "overall" | "snow" | "closest";

export const RANK_BY: Record<RankBy, string> = {
  overall: "Best overall",
  snow: "Most snow",
  closest: "Closest",
};

const byName = (a: Pick, b: Pick) => a.resort.name.localeCompare(b.resort.name);
const shownSnow = (p: Pick) => (p.snowIn < 0.1 ? 0 : Math.round(p.snowIn * 10) / 10);
const byDrive = (a: Pick, b: Pick) => (a.driveHours ?? 0) - (b.driveHours ?? 0);

const SORTS: Record<RankBy, (a: Pick, b: Pick) => number> = {
  // The blend: snow, rain, wind and drive time together (weights above).
  overall: (a, b) => b.score - a.score || byDrive(a, b) || byName(a, b),
  // Snow on the day only, as shown (to the tenth; under 0.1" is none); ties go closest first.
  snow: (a, b) => shownSnow(b) - shownSnow(a) || byDrive(a, b) || byName(a, b),
  closest: (a, b) => byDrive(a, b) || b.snowIn - a.snowIn || byName(a, b),
};

export function rankDay(
  list: Resort[],
  forecasts: Record<string, ResortForecast>,
  date: string,
  origin: LatLon | null,
  maxDriveHours: number | null,
  rankBy: RankBy = "overall",
  /** Keep mountains that aren't open yet (Decide shows them greyed out). */
  includeClosed = false,
): Pick[] {
  return list
    .flatMap((resort) => {
      const forecast = forecasts[resort.id];
      const pick = forecast && scoreDay(resort, forecast, date, origin);
      if (!pick || (!pick.open && !includeClosed)) return [];
      if (maxDriveHours != null && pick.driveHours != null && pick.driveHours > maxDriveHours) return [];
      return [pick];
    })
    .sort(SORTS[rankBy]);
}

/** The best resort-and-day combination in the next 7 days, if any day has real snow. */
export function bestThisWeek(
  list: Resort[],
  forecasts: Record<string, ResortForecast>,
  origin: LatLon | null,
): { pick: Pick; dayIndex: number } | null {
  let best: { pick: Pick; dayIndex: number } | null = null;
  const days = list.map((r) => forecasts[r.id]).find(Boolean)?.upcoming ?? [];
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const top = rankDay(list, forecasts, days[dayIndex].date, origin, null)[0];
    if (top && top.snowIn >= 1 && (!best || top.score > best.pick.score)) best = { pick: top, dayIndex };
  }
  return best;
}
