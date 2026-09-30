import { OUTLOOK_DAYS, TIMEZONE, sum, todayInTimezone } from "@/lib/forecast";
import type { Resort } from "@/lib/resorts";

// The detailed forecast behind a single resort page. The Overview's all-resort summary stays
// light (see forecast.ts); this adds hour-by-hour detail at two elevations and a model range.

/** The three global models we compare. Their spread is the forecast's uncertainty. */
export const MODELS = [
  { id: "gfs_seamless", label: "GFS", origin: "US" },
  { id: "ecmwf_ifs025", label: "ECMWF", origin: "Europe" },
  { id: "gem_seamless", label: "GEM", origin: "Canada" },
] as const;
export type ModelId = (typeof MODELS)[number]["id"];

export const HOURLY_HOURS = 72;
const FEET_PER_METER = 3.28084;

export type PrecipKind = "none" | "snow" | "mix" | "rain";

export type HourlyPoint = {
  /** Local time, YYYY-MM-DDTHH:mm. */
  time: string;
  snowIn: number;
  precipIn: number;
  tempF: number | null;
  gustMph: number | null;
  freezingLevelFt: number | null;
  kind: PrecipKind;
};

export type ElevationForecast = {
  elevationFt: number;
  hours: HourlyPoint[];
};

export type ModelDay = {
  date: string;
  /** Snowfall per model, in inches. Null when a model doesn't reach this far ahead. */
  byModel: Record<ModelId, number | null>;
  lowIn: number | null;
  highIn: number | null;
  /** Average of the models that have a value. */
  meanIn: number | null;
};

export type ResortDetailForecast = {
  summit: ElevationForecast;
  base: ElevationForecast;
  models: ModelDay[];
};

/**
 * What falls at a given temperature. Wet-bulb effects blur the line near freezing,
 * so 33–35°F is called a mix rather than guessing.
 */
export function precipKind(precipIn: number, tempF: number | null): PrecipKind {
  if (precipIn < 0.005) return "none";
  if (tempF == null) return "mix";
  if (tempF <= 32.5) return "snow";
  if (tempF <= 35) return "mix";
  return "rain";
}

const COMMON = {
  timezone: TIMEZONE,
  temperature_unit: "fahrenheit",
  precipitation_unit: "inch",
  wind_speed_unit: "mph",
};

export function buildHourlyUrl(resort: Resort): string {
  const summitFt = resort.summitFt ?? 0;
  const baseFt = resort.baseFt ?? summitFt;
  const params = new URLSearchParams({
    ...COMMON,
    // The same point twice, at summit then base height: Open-Meteo adjusts for elevation.
    latitude: `${resort.lat},${resort.lat}`,
    longitude: `${resort.lon},${resort.lon}`,
    elevation: [summitFt, baseFt].map((ft) => Math.round(ft / FEET_PER_METER)).join(","),
    hourly: "snowfall,precipitation,temperature_2m,wind_gusts_10m,freezing_level_height",
    forecast_hours: String(HOURLY_HOURS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function buildModelsUrl(resort: Resort): string {
  const midFt = resort.summitFt && resort.baseFt ? (resort.summitFt + resort.baseFt) / 2 : resort.summitFt;
  const params = new URLSearchParams({
    ...COMMON,
    latitude: String(resort.lat),
    longitude: String(resort.lon),
    daily: "snowfall_sum",
    models: MODELS.map((m) => m.id).join(","),
    forecast_days: String(OUTLOOK_DAYS),
  });
  if (midFt) params.set("elevation", String(Math.round(midFt / FEET_PER_METER)));
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

type Series = (number | null)[] | undefined;

type HourlyLocation = {
  hourly?: {
    time: string[];
    snowfall?: Series;
    precipitation?: Series;
    temperature_2m?: Series;
    wind_gusts_10m?: Series;
    freezing_level_height?: Series;
  };
  hourly_units?: { freezing_level_height?: string };
};

type ModelsLocation = {
  daily?: { time: string[] } & Record<string, Series | string[]>;
};

function toFeet(value: number | null | undefined, unit: string | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return unit === "m" ? value * FEET_PER_METER : value;
}

function parseElevation(loc: HourlyLocation | undefined, elevationFt: number): ElevationForecast {
  const h = loc?.hourly;
  const unit = loc?.hourly_units?.freezing_level_height;
  const hours = (h?.time ?? []).map((time, i): HourlyPoint => {
    const precipIn = h?.precipitation?.[i] ?? 0;
    const tempF = h?.temperature_2m?.[i] ?? null;
    return {
      time,
      snowIn: h?.snowfall?.[i] ?? 0,
      precipIn,
      tempF,
      gustMph: h?.wind_gusts_10m?.[i] ?? null,
      freezingLevelFt: toFeet(h?.freezing_level_height?.[i], unit),
      kind: precipKind(precipIn, tempF),
    };
  });
  return { elevationFt, hours };
}

export function parseHourly(resort: Resort, body: HourlyLocation | HourlyLocation[]) {
  const [summit, base] = Array.isArray(body) ? body : [body, body];
  return {
    summit: parseElevation(summit, resort.summitFt ?? 0),
    base: parseElevation(base, resort.baseFt ?? resort.summitFt ?? 0),
  };
}

export function parseModels(body: ModelsLocation, now = new Date()): ModelDay[] {
  const daily = body.daily;
  const today = todayInTimezone(now);
  return (daily?.time ?? []).flatMap((date, i) => {
    if (date < today) return [];
    const byModel = Object.fromEntries(
      MODELS.map((m) => [m.id, (daily?.[`snowfall_sum_${m.id}`] as Series)?.[i] ?? null]),
    ) as Record<ModelId, number | null>;
    const values = Object.values(byModel).filter((v): v is number => v != null);
    return [
      {
        date,
        byModel,
        lowIn: values.length ? Math.min(...values) : null,
        highIn: values.length ? Math.max(...values) : null,
        meanIn: values.length ? sum(values) / values.length : null,
      },
    ];
  });
}

// ── Summaries used by the resort page ───────────────────────────────────

/** Lifts on exposed Northeast summits start going on wind hold around here. */
export const WIND_HOLD_MPH = 40;

export type Block = {
  start: string;
  snowIn: number;
  precipIn: number;
  kind: PrecipKind;
  tempF: number | null;
  gustMph: number | null;
};

const KIND_RANK: Record<PrecipKind, number> = { none: 0, snow: 1, mix: 2, rain: 3 };

/** Groups hours into blocks (3 h by default) so 72 hours fit on a phone. */
export function toBlocks(hours: HourlyPoint[], size = 3): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < hours.length; i += size) {
    const slice = hours.slice(i, i + size);
    const temps = slice.map((h) => h.tempF).filter((t): t is number => t != null);
    const gusts = slice.map((h) => h.gustMph).filter((g): g is number => g != null);
    blocks.push({
      start: slice[0].time,
      snowIn: sum(slice.map((h) => h.snowIn)),
      precipIn: sum(slice.map((h) => h.precipIn)),
      // The "wettest" type in the block wins: one hour of rain is what you'll remember.
      kind: slice.reduce<PrecipKind>((k, h) => (KIND_RANK[h.kind] > KIND_RANK[k] ? h.kind : k), "none"),
      tempF: temps.length ? sum(temps) / temps.length : null,
      gustMph: gusts.length ? Math.max(...gusts) : null,
    });
  }
  return blocks;
}

export type SnowLine = "all-snow" | "rain-below" | "all-rain" | "dry";

/** Where precipitation turns to snow over the next 72 hours, summit vs base. */
export function snowLine(summit: ElevationForecast, base: ElevationForecast): SnowLine {
  const wet = (e: ElevationForecast) => e.hours.filter((h) => h.kind !== "none");
  const summitWet = wet(summit);
  const baseWet = wet(base);
  if (summitWet.length === 0 && baseWet.length === 0) return "dry";
  const rainy = (list: HourlyPoint[]) => list.some((h) => h.kind === "rain" || h.kind === "mix");
  if (rainy(summitWet)) return "all-rain";
  if (rainy(baseWet)) return "rain-below";
  return "all-snow";
}
