import { fromArrayBuffer } from "geotiff";
import type { Resort } from "@/lib/resorts";

// What actually fell: NOAA's National Snowfall Analysis (NOHRSC), which corrects radar and model
// estimates against observers' reports. Issued for 00 and 12 UTC as a 0.04° grid over the lower 48.
// The GeoTIFF values are inches (the NetCDF version of the same data is in meters).

export type ObservedSnow = {
  /** End of the 24- and 48-hour windows, ISO time (UTC). */
  endsAt: string;
  /** Inches by resort id; null where the grid has no value. */
  last24: Record<string, number | null>;
  last48: Record<string, number | null>;
};

const BASE = "https://www.nohrsc.noaa.gov/snowfall/data";
/** The grid's top-left corner and cell size, in degrees. */
const WEST = -126;
const NORTH = 55;
const CELL = 0.04;
/** Files appear a few hours after their time; look back this many 12-hour cycles. */
const LOOKBACK_CYCLES = 4;

const pad = (n: number) => String(n).padStart(2, "0");

/** The 00/12 UTC cycles, newest first, as YYYYMMDDHH. */
export function recentCycles(now = new Date()): string[] {
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  t.setUTCHours(t.getUTCHours() < 12 ? 0 : 12);
  return Array.from({ length: LOOKBACK_CYCLES }, (_, i) => {
    const c = new Date(t.getTime() - i * 12 * 3600 * 1000);
    return `${c.getUTCFullYear()}${pad(c.getUTCMonth() + 1)}${pad(c.getUTCDate())}${pad(c.getUTCHours())}`;
  });
}

export const fileUrl = (cycle: string, hours: 24 | 48) =>
  `${BASE}/${cycle.slice(0, 6)}/sfav2_CONUS_${hours}h_${cycle}.tif`;

export const cycleTime = (cycle: string) =>
  `${cycle.slice(0, 4)}-${cycle.slice(4, 6)}-${cycle.slice(6, 8)}T${cycle.slice(8, 10)}:00:00Z`;

/** Reads the value at each resort's location (the cell it falls in). */
export async function sampleGrid(data: ArrayBuffer, list: Resort[]): Promise<Record<string, number | null>> {
  const image = await (await fromArrayBuffer(data)).getImage();
  const [values] = (await image.readRasters()) as unknown as [ArrayLike<number>];
  const width = image.getWidth();
  const height = image.getHeight();
  return Object.fromEntries(
    list.map((r) => {
      const col = Math.floor((r.lon - WEST) / CELL);
      const row = Math.floor((NORTH - r.lat) / CELL);
      const v = col >= 0 && col < width && row >= 0 && row < height ? values[row * width + col] : null;
      return [r.id, v == null || v < 0 ? null : Math.round(v * 10) / 10];
    }),
  );
}
