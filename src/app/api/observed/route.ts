import { connection } from "next/server";
import { cycleTime, fileUrl, recentCycles, sampleGrid, type ObservedSnow } from "@/lib/observed";
import { resorts } from "@/lib/resorts";

// A new analysis comes out twice a day; check hourly for it.
// The analysis covers the lower 48 only: Canadian and Alaskan mountains get no observed value.
const usResorts = resorts.filter((r) => r.country === "US" && r.state !== "AK");
const REVALIDATE_SECONDS = 3600;

const get = (url: string) => fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });

/** Observed snowfall over the last 24 and 48 hours at every resort, from the newest NOAA analysis. */
export async function GET() {
  await connection();
  try {
    for (const cycle of recentCycles()) {
      const [day, twoDays] = await Promise.all([get(fileUrl(cycle, 24)), get(fileUrl(cycle, 48))]);
      if (!day.ok || !twoDays.ok) continue;
      const body: ObservedSnow = {
        endsAt: cycleTime(cycle),
        last24: await sampleGrid(await day.arrayBuffer(), usResorts),
        last48: await sampleGrid(await twoDays.arrayBuffer(), usResorts),
      };
      return Response.json(body);
    }
    return Response.json({ error: "No recent snowfall analysis" }, { status: 502 });
  } catch {
    return Response.json({ error: "Could not reach the snowfall analysis" }, { status: 502 });
  }
}
