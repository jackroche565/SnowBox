import { connection } from "next/server";
import { NWS_HEADERS, alertsFor, alertsUrl, parseAlerts, type NwsAlert } from "@/lib/nws";
import { resorts } from "@/lib/resorts";

// Warnings change within minutes of being issued; every visitor shares a 10-minute copy.
const REVALIDATE_SECONDS = 600;
/** The weather service can be slow; give up rather than leave the page waiting. */
const TIMEOUT_MS = 10_000;

export type AlertsResponse = { alerts: Record<string, NwsAlert[]> };

/** Active weather service warnings for every resort that has one. */
export async function GET() {
  await connection();
  try {
    const res = await fetch(alertsUrl(), {
      headers: NWS_HEADERS,
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return Response.json({ error: `Weather service returned ${res.status}` }, { status: 502 });
    const area = parseAlerts(await res.json());
    const alerts: Record<string, NwsAlert[]> = {};
    for (const resort of resorts) {
      const list = alertsFor(resort, area);
      if (list.length) alerts[resort.id] = list;
    }
    return Response.json({ alerts } satisfies AlertsResponse);
  } catch {
    return Response.json({ error: "Could not reach the weather service" }, { status: 502 });
  }
}
