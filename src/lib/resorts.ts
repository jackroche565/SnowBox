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
  /** Lift-served vertical drop, in feet. */
  verticalFt?: number;
};

export const resorts = resortData as Resort[];
