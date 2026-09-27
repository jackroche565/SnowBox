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
  /** Fields whose values are estimates or conflict between sources (or, for URLs, not a dedicated page). */
  estimates?: (keyof Resort)[];
};

export const resorts = resortData as Resort[];

export function getResort(id: string): Resort | undefined {
  return resorts.find((r) => r.id === id);
}

export const resortPath = (id: string) => `/resorts/${id}`;

export const isEstimate = (resort: Resort, field: keyof Resort) => resort.estimates?.includes(field) ?? false;
