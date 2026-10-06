import type { Resort } from "@/lib/resorts";

// When each mountain opens. Wind holds and day rankings only mean something once lifts run.

/** Areas without a projected date are mostly small, natural-snow hills that rarely open before mid-December. */
const UNANNOUNCED_OPENING = "12-15";

/** The day lifts are expected to start for the season that `date` (YYYY-MM-DD) falls in. */
export function openingDate(resort: Resort, date: string): string {
  if (resort.opensOn) return resort.opensOn;
  // January to June belong to the season that started the previous fall.
  const year = Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 7 ? 1 : 0);
  return `${year}-${UNANNOUNCED_OPENING}`;
}

export const isOpenOn = (resort: Resort, date: string) => date >= openingDate(resort, date);

/** "Nov 20" */
export function formatOpening(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
