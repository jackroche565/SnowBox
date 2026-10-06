import { connection, type NextRequest } from "next/server";
import { asLocations, buildFarUrl, buildNearUrl, parseForecasts, type ForecastResponse, type OpenMeteoLocation } from "@/lib/forecast";
import { isRegion, resortsIn } from "@/lib/regions";

// One region at a time, shared by every visitor. The near-term part (conditions now and the next
// 7 days) refreshes hourly, about as often as the underlying models update; the past week and
// long range refresh every 6 hours. Keeps the whole map inside Open-Meteo's free daily limit.
const NEAR_SECONDS = 3600;
const FAR_SECONDS = 6 * 3600;
/** Locations per Open-Meteo request, to keep URLs and responses a sensible size. */
const CHUNK = 100;

async function fetchAll(urls: string[], revalidate: number): Promise<OpenMeteoLocation[]> {
  const bodies = await Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url, { next: { revalidate } });
      if (!res.ok) throw new Error(`Forecast service returned ${res.status}`);
      return asLocations(await res.json());
    }),
  );
  return bodies.flat();
}

export async function GET(req: NextRequest) {
  // Fetch at request time, not during `next build`.
  await connection();
  const region = req.nextUrl.searchParams.get("region");
  if (!isRegion(region)) return Response.json({ error: "Unknown region" }, { status: 400 });

  const list = resortsIn(region);
  const chunks = Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK));
  // If one part is refused (Open-Meteo's per-minute limit, say), serve the other rather than
  // nothing: the next 7 days without the past week, or the slower part's older numbers.
  const [near, far] = await Promise.allSettled([
    fetchAll(chunks.map(buildNearUrl), NEAR_SECONDS),
    fetchAll(chunks.map(buildFarUrl), FAR_SECONDS),
  ]);
  if (near.status === "rejected" && far.status === "rejected") {
    const reason = near.reason instanceof Error ? near.reason.message : "Could not reach the forecast service";
    return Response.json({ error: reason }, { status: 502 });
  }
  const body: ForecastResponse = {
    forecasts: parseForecasts(list, near.status === "fulfilled" ? near.value : [], far.status === "fulfilled" ? far.value : []),
  };
  return Response.json(body);
}
