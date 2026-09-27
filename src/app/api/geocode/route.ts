import type { NextRequest } from "next/server";
import { normalizeState } from "@/lib/usStates";

export type GeocodeResult = {
  label: string;
  lat: number;
  lon: number;
};

type OpenMeteoPlace = {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  population?: number;
};

// Accepts a US zip code ("05672"), a city ("Burlington") or a city and state ("Burlington, VT").
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ error: "Enter a city or zip code" }, { status: 400 });
  }

  // Open-Meteo matches a single place name or postal code, so split off any state part.
  const [place, statePart] = query.split(",").map((part) => part.trim());
  const state = statePart ? normalizeState(statePart) : undefined;

  const params = new URLSearchParams({
    name: place,
    count: "20",
    countryCode: "US",
    language: "en",
    format: "json",
  });

  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return Response.json({ error: `Location service returned ${res.status}` }, { status: 502 });
    }
    const data: { results?: OpenMeteoPlace[] } = await res.json();
    const matches = (data.results ?? []).filter((r) => !state || r.admin1 === state);
    // Among same-named towns, prefer the Northeast, where the resorts are.
    const northeast = ["Vermont", "New Hampshire", "Maine", "New York", "Massachusetts", "Connecticut", "Rhode Island"];
    const best = matches.find((r) => r.admin1 && northeast.includes(r.admin1)) ?? matches[0];
    if (!best) {
      return Response.json({ error: `Couldn't find "${query}"` }, { status: 404 });
    }
    const result: GeocodeResult = {
      label: [best.name, best.admin1].filter(Boolean).join(", "),
      lat: best.latitude,
      lon: best.longitude,
    };
    return Response.json(result);
  } catch {
    return Response.json({ error: "Could not reach the location service" }, { status: 502 });
  }
}
