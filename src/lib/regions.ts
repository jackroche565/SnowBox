import { resorts, type Resort } from "@/lib/resorts";

// Snowbox covers the US and Canada in regions. Each mountain belongs to one (`region` in
// resorts.json, set by state or province). Forecasts are fetched a region at a time.

export const REGIONS = [
  { id: "northeast", label: "Northeast" },
  { id: "southeast", label: "Southeast" },
  { id: "midwest", label: "Midwest" },
  { id: "rockies", label: "Rockies" },
  { id: "california", label: "Sierra & California" },
  { id: "pnw", label: "Pacific Northwest" },
  { id: "alaska", label: "Alaska" },
  { id: "canada-west", label: "Western Canada" },
  { id: "canada-east", label: "Eastern Canada" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const DEFAULT_REGION: RegionId = "northeast";

export const isRegion = (value: unknown): value is RegionId => REGIONS.some((r) => r.id === value);

export const regionLabel = (id: RegionId) => REGIONS.find((r) => r.id === id)!.label;

export const resortsIn = (region: RegionId): Resort[] => resorts.filter((r) => r.region === region);

export type Bounds = [[number, number], [number, number]];

/**
 * The corners of a region's mountains, [[west, south], [east, north]], for framing the map. In
 * bigger regions the few farthest-out mountains (Fort Kent, Maine; the Yukon) are left out of the
 * frame so the rest aren't shrunk into a corner; they're a short pan away.
 */
export function regionBounds(region: RegionId): Bounds {
  const list = resortsIn(region);
  const trim = list.length >= 20 ? Math.floor(list.length * 0.03) : 0;
  const range = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return [sorted[trim], sorted[sorted.length - 1 - trim]];
  };
  const [west, east] = range(list.map((r) => r.lon));
  const [south, north] = range(list.map((r) => r.lat));
  return [
    [west, south],
    [east, north],
  ];
}
