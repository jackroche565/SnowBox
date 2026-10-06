import type { Pass } from "@/lib/resorts";

export const PASS_COLORS: Record<Pass, string> = {
  Epic: "#ea580c",
  Ikon: "#2563eb",
  Indy: "#16a34a",
};
/** Resorts on none of the three passes: ink, so they read as part of the map, not greyed out. */
export const INDEPENDENT_COLOR = "#0f1a2a";

export function resortColor(passes: Pass[]): string {
  return passes.length ? PASS_COLORS[passes[0]] : INDEPENDENT_COLOR;
}

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
  snow: "#1f5f8b",
  mix: "#9a7fc4",
  rain: "#7a8699",
} as const;

/** "3pm" for a YYYY-MM-DDTHH:mm local time. */
export function formatHour(time: string): string {
  const hour = Number(time.slice(11, 13));
  return `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
}
