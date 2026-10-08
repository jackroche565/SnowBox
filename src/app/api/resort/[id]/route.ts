import { connection, type NextRequest } from "next/server";
import { getResort } from "@/lib/resorts";
import {
  buildHourlyUrl,
  buildModelsUrl,
  parseHourly,
  parseModels,
  type ResortDetailForecast,
} from "@/lib/resortForecast";

// Same cadence as the all-resort summary: every visitor shares a copy for 30 minutes.
const REVALIDATE_SECONDS = 1800;
/** Give up on a slow upstream rather than leave the page loading. */
const TIMEOUT_MS = 15_000;

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/resort/[id]">) {
  await connection();

  const resort = getResort((await ctx.params).id);
  if (!resort) return Response.json({ error: "Unknown resort" }, { status: 404 });

  try {
    const [hourlyRes, modelsRes] = await Promise.all([
      fetch(buildHourlyUrl(resort), { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) }),
      fetch(buildModelsUrl(resort), { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) }),
    ]);
    if (!hourlyRes.ok || !modelsRes.ok) {
      return Response.json(
        { error: `Forecast service returned ${hourlyRes.ok ? modelsRes.status : hourlyRes.status}` },
        { status: 502 },
      );
    }
    const body: ResortDetailForecast = {
      ...parseHourly(resort, await hourlyRes.json()),
      models: parseModels(await modelsRes.json(), resort.timezone),
    };
    return Response.json(body);
  } catch {
    return Response.json({ error: "Could not reach the forecast service" }, { status: 502 });
  }
}
