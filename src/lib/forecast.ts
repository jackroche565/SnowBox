import type { Resort } from "@/lib/resorts";

export type DailyForecast = {
  date: string; // YYYY-MM-DD, resort local time
  snowIn: number | null;
  highF: number | null;
  lowF: number | null;
  /** Strongest wind gust of the day at the grid point, in mph. */
  gustMph: number | null;
};

export type ResortForecast = {
  /** Modeled snow depth on the ground right now, in inches. Not a resort-reported base. */
  snowDepthIn: number | null;
  tempF: number | null;
  /** Total snowfall over the previous 7 days, in inches. */
  past7In: number;
  /** Forecast snowfall for today alone, in inches. */
  todayIn: number;
  /** Total forecast snowfall for today plus the next 2 days, in inches. */
  next3In: number;
  /** Total forecast snowfall for today plus the next 6 days, in inches. */
  next7In: number;
  /** Total forecast snowfall for days 8 to 16. Long-range: treat as a trend, not a number. */
  days8to16In: number;
  /** Today plus the next 6 days. */
  upcoming: DailyForecast[];
  /** Today plus the next 15 days. */
  outlook: DailyForecast[];
  /** The previous 7 days, oldest first. */
  past: DailyForecast[];
};

export type ForecastResponse = {
  forecasts: Record<string, ResortForecast>;
};

export const TIMEZONE = "America/New_York";
/** How far ahead the outlook reaches. 16 is Open-Meteo's maximum. */
export const OUTLOOK_DAYS = 16;

export function buildForecastUrl(list: Resort[]): string {
  const params = new URLSearchParams({
    latitude: list.map((r) => r.lat).join(","),
    longitude: list.map((r) => r.lon).join(","),
    current: "temperature_2m,snow_depth",
    daily: "snowfall_sum,temperature_2m_max,temperature_2m_min,wind_gusts_10m_max",
    past_days: "7",
    forecast_days: String(OUTLOOK_DAYS),
    timezone: TIMEZONE,
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    wind_speed_unit: "mph",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

// Open-Meteo reports its units alongside the data; convert whatever it sends to inches.
const INCHES_PER_UNIT: Record<string, number> = {
  inch: 1,
  in: 1,
  ft: 12,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
  m: 39.3701,
};

function toInches(value: number | null | undefined, unit: string | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const factor = INCHES_PER_UNIT[unit ?? "inch"];
  if (factor === undefined) return null;
  return value * factor;
}

type OpenMeteoLocation = {
  current?: { temperature_2m?: number | null; snow_depth?: number | null };
  current_units?: { snow_depth?: string };
  daily?: {
    time: string[];
    snowfall_sum?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    wind_gusts_10m_max?: (number | null)[];
  };
  daily_units?: { snowfall_sum?: string };
};

export function todayInTimezone(now: Date): string {
  // en-CA formats dates as YYYY-MM-DD, matching Open-Meteo's daily timestamps.
  return now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

export function sum(values: (number | null)[]): number {
  return values.reduce<number>((total, v) => total + (v ?? 0), 0);
}

export function parseLocation(loc: OpenMeteoLocation, now = new Date()): ResortForecast {
  const today = todayInTimezone(now);
  const daily = loc.daily;
  const snowUnit = loc.daily_units?.snowfall_sum;

  const days: DailyForecast[] = (daily?.time ?? []).map((date, i) => ({
    date,
    snowIn: toInches(daily?.snowfall_sum?.[i], snowUnit),
    highF: daily?.temperature_2m_max?.[i] ?? null,
    lowF: daily?.temperature_2m_min?.[i] ?? null,
    gustMph: daily?.wind_gusts_10m_max?.[i] ?? null,
  }));
  const past = days.filter((d) => d.date < today);
  const outlook = days.filter((d) => d.date >= today);
  const snowOver = (list: DailyForecast[]) => sum(list.map((d) => d.snowIn));

  return {
    snowDepthIn: toInches(loc.current?.snow_depth, loc.current_units?.snow_depth),
    tempF: loc.current?.temperature_2m ?? null,
    past7In: snowOver(past),
    todayIn: snowOver(outlook.slice(0, 1)),
    next3In: snowOver(outlook.slice(0, 3)),
    next7In: snowOver(outlook.slice(0, 7)),
    days8to16In: snowOver(outlook.slice(7)),
    upcoming: outlook.slice(0, 7),
    outlook,
    past,
  };
}

/** Pairs each resort with its entry in an Open-Meteo multi-location response. */
export function parseForecastResponse(
  list: Resort[],
  body: OpenMeteoLocation | OpenMeteoLocation[],
  now = new Date(),
): Record<string, ResortForecast> {
  // Open-Meteo returns a bare object for one location and an array (in request order) for several.
  const locations = Array.isArray(body) ? body : [body];
  const forecasts: Record<string, ResortForecast> = {};
  list.forEach((resort, i) => {
    if (locations[i]) forecasts[resort.id] = parseLocation(locations[i], now);
  });
  return forecasts;
}
