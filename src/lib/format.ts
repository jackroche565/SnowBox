import type { Pass } from "@/lib/resorts";

export const PASS_COLORS: Record<Pass, string> = {
  Epic: "#ea580c",
  Ikon: "#2563eb",
  Indy: "#16a34a",
};

export function formatInches(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value > 0 && value < 0.1) return '<0.1"';
  return `${value < 10 ? value.toFixed(1).replace(/\.0$/, "") : Math.round(value)}"`;
}

export function formatTemp(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}°`;
}

export function formatDay(date: string, index: number): string {
  if (index === 0) return "Today";
  // Noon avoids the date shifting across a timezone boundary.
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export function formatFeet(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value).toLocaleString("en-US")} ft`;
}

/** "Sat, Oct 4" for a YYYY-MM-DD date. */
export function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Colors for what's falling. Snow uses glacier; the rest are muted so snow stays the story. */
export const PRECIP_COLORS = {
  snow: "#4a90b8",
  mix: "#9a7fc4",
  rain: "#7a8699",
} as const;

/** "3pm" for a YYYY-MM-DDTHH:mm local time. */
export function formatHour(time: string): string {
  const hour = Number(time.slice(11, 13));
  return `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
}

/** Map pin colors by 7-day forecast snow: grey for none, deepening blues as it piles up. */
export const SNOW_SCALE = [
  { from: 0, color: "#a7b1bf", label: "0\"" },
  { from: 0.5, color: "#9fcbe6", label: "½\"" },
  { from: 3, color: "#4a90b8", label: "3\"" },
  { from: 6, color: "#24618f", label: "6\"" },
  { from: 12, color: "#101826", label: "12\"+" },
] as const;

export function snowColor(inches: number | null | undefined): string {
  const v = inches ?? 0;
  return [...SNOW_SCALE].reverse().find((s) => v >= s.from)!.color;
}
