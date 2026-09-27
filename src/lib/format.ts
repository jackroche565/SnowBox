import type { Pass } from "@/lib/resorts";

export const PASS_COLORS: Record<Pass, string> = {
  Epic: "#ea580c",
  Ikon: "#2563eb",
  Indy: "#16a34a",
};
const MULTI_PASS_COLOR = "#7c3aed";

export function passColor(passes: Pass[]): string {
  return passes.length === 1 ? PASS_COLORS[passes[0]] : MULTI_PASS_COLOR;
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
