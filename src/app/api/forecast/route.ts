import { connection } from "next/server";
import { buildForecastUrl, parseForecastResponse, type ForecastResponse } from "@/lib/forecast";
import { resorts } from "@/lib/resorts";

// Forecasts refresh at most every 30 minutes; every visitor shares the cached copy.
const REVALIDATE_SECONDS = 1800;

export async function GET() {
  // Fetch at request time, not during `next build`.
  await connection();

  try {
    const res = await fetch(buildForecastUrl(resorts), {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      return Response.json(
        { error: `Forecast service returned ${res.status}` },
        { status: 502 },
      );
    }
    const body: ForecastResponse = {
      forecasts: parseForecastResponse(resorts, await res.json()),
    };
    return Response.json(body);
  } catch {
    return Response.json({ error: "Could not reach the forecast service" }, { status: 502 });
  }
}
