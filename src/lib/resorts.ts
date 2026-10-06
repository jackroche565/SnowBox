import resortData from "@/data/resorts.json";

export const PASSES = ["Epic", "Ikon", "Indy"] as const;
export type Pass = (typeof PASSES)[number];

export type Resort = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  passes: Pass[];
  /** Top of the lift-served terrain, in feet. */
  summitFt?: number;
  /** Main base area, in feet. */
  baseFt?: number;
  /** Lift-served vertical drop, in feet. */
  verticalFt?: number;
  trails?: number;
  trailMapUrl?: string;
  snowReportUrl?: string;
  webcamUrl?: string;
  /** The resort's own homepage, for areas without a dedicated snow report page on file. */
  websiteUrl?: string;
  /** Projected opening day this season (YYYY-MM-DD), from OnTheSnow. Not official; update each fall. */
  opensOn?: string;
  /** Weather service office (e.g. "BTV") and the forecast zone and county the mountain sits in. */
  nws?: { office: string; zone: string; county: string };
  /** Fields whose values are estimates or conflict between sources (or, for URLs, not a dedicated page). */
  estimates?: (keyof Resort)[];
};

export const resorts = resortData as Resort[];

export function getResort(id: string): Resort | undefined {
  return resorts.find((r) => r.id === id);
}

export const resortPath = (id: string) => `/resorts/${id}`;

export const isEstimate = (resort: Resort, field: keyof Resort) => resort.estimates?.includes(field) ?? false;
