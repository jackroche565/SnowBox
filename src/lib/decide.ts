import type { DailyForecast, ResortForecast } from "@/lib/forecast";
import type { LatLon } from "@/lib/geo";
import { distanceMiles } from "@/lib/geo";
import type { Resort } from "@/lib/resorts";
import { isOpenOn } from "@/lib/season";

// Ranks resorts for one day, by that day's snow or by drive time. No blended score.

/** Roads wind; straight-line miles are multiplied by this to approximate road miles. */
const ROAD_FACTOR = 1.25;
/** Average speed for an estimated drive, mixing highway and mountain roads. Typical drives
 *  from Boston to Loon, Stratton, Killington, Sunday River and Sugarloaf come out within about half an hour. */
const AVERAGE_MPH = 55;

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

export type Pick = {
  resort: Resort;
  day: DailyForecast;
  snowIn: number;
  rainIn: number;
  gustMph: number | null;
  /** Whether the mountain is expected to be open that day (see season.ts). */
  open: boolean;
  driveHours: number | null;
};

/** A resort's numbers for one date (YYYY-MM-DD). By date, not position: mountains in a region can sit in
 *  different time zones, so near midnight one's "today" is another's "tomorrow". */
export function pickDay(resort: Resort, forecast: ResortForecast, date: string, origin: LatLon | null): Pick | null {
  const timeline = [...forecast.past, ...forecast.outlook];
  const at = timeline.findIndex((d) => d.date === date);
  if (at === -1) return null;
  const day = timeline[at];

  const snowIn = day.snowIn ?? 0;
  const rainIn = day.rainIn ?? 0;
  const gustMph = day.gustMph;
  const open = isOpenOn(resort, day.date);
  const driveHours = origin ? estimateDriveHours(origin, resort) : null;

  return { resort, day, snowIn, rainIn, gustMph, open, driveHours };
}

export type RankBy = "snow" | "closest";

const byName = (a: Pick, b: Pick) => a.resort.name.localeCompare(b.resort.name);
const shownSnow = (p: Pick) => (p.snowIn < 0.1 ? 0 : Math.round(p.snowIn * 10) / 10);
const byDrive = (a: Pick, b: Pick) => (a.driveHours ?? 0) - (b.driveHours ?? 0);

const SORTS: Record<RankBy, (a: Pick, b: Pick) => number> = {
  // Snow on the day only, as shown (to the tenth; under 0.1" is none); ties go closest first.
  snow: (a, b) => shownSnow(b) - shownSnow(a) || byDrive(a, b) || byName(a, b),
  closest: (a, b) => byDrive(a, b) || b.snowIn - a.snowIn || byName(a, b),
};

export function rankDay(
  list: Resort[],
  forecasts: Record<string, ResortForecast>,
  date: string,
  origin: LatLon | null,
  rankBy: RankBy,
  /** Keep mountains that aren't open yet (Decide shows them greyed out). */
  includeClosed = false,
): Pick[] {
  return list
    .flatMap((resort) => {
      const forecast = forecasts[resort.id];
      const pick = forecast && pickDay(resort, forecast, date, origin);
      if (!pick || (!pick.open && !includeClosed)) return [];
      return [pick];
    })
    .sort(SORTS[rankBy]);
}
