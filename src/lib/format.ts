/** Next-7-day snow buckets for the Explore map's dots and legend, lightest to deepest. */
export const SNOW_BUCKETS = [
  { label: "None", min: 0, color: "#cfd7e0" },
  { label: '1–5"', min: 1, color: "#8fb7d4" },
  { label: '6–11"', min: 6, color: "#1f5f8b" },
  { label: '12"+', min: 12, color: "#123f60" },
] as const;

export function snowBucketColor(inches: number): string {
  return [...SNOW_BUCKETS].reverse().find((b) => inches >= b.min)!.color;
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
