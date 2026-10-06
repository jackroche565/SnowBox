import officeNames from "@/data/nwsOffices.json";
import { resorts, type Resort } from "@/lib/resorts";

// The National Weather Service: active warnings for each mountain, and the local office's
// forecaster discussion. Free and keyless, but the API asks every caller to identify itself.

export const NWS_HEADERS = {
  "User-Agent": "Snowbox (github.com/jackroche565/SnowBox)",
  Accept: "application/geo+json",
};

/** The US states our mountains are in: one alerts request covers all of them. */
const STATES = [...new Set(resorts.filter((r) => r.country === "US").map((r) => r.state))].sort().join(",");

/** Each forecast office's city, e.g. BTV → Burlington (from the weather service's office list). */
const OFFICE_NAMES: Record<string, string> = officeNames;

export const officeName = (office: string) => OFFICE_NAMES[office] ?? office;

/** Alerts a skier acts on. Frost, flood, marine and lake-wind alerts are left out. */
const SKI_ALERT = /winter|blizzard|ice storm|snow|high wind|wind advisory|extreme wind|cold|wind chill|freezing rain/i;
const NOT_SKI = /lake wind|frost|freeze warning|freeze watch/i;

export type NwsAlert = {
  event: string;
  /** When it ends (or, failing that, expires), ISO time. */
  until: string | null;
  severity: string;
};

export type NwsDiscussion = {
  office: string;
  issued: string;
  /** "Key messages" if the office writes them, otherwise the synopsis; one string per paragraph. */
  title: string;
  paragraphs: string[];
  url: string;
};

export type ResortNws = { alerts: NwsAlert[]; discussion: NwsDiscussion | null };

type AlertFeature = {
  properties: {
    event: string;
    severity: string;
    status: string;
    messageType: string;
    ends: string | null;
    expires: string | null;
    affectedZones: string[];
  };
};

export type AreaAlert = NwsAlert & { zones: string[] };

/** Every active, skier-relevant alert across our states. */
export function parseAlerts(body: { features?: AlertFeature[] }): AreaAlert[] {
  return (body.features ?? []).flatMap(({ properties: p }) => {
    if (p.status !== "Actual" || p.messageType === "Cancel") return [];
    if (!SKI_ALERT.test(p.event) || NOT_SKI.test(p.event)) return [];
    return [
      {
        event: p.event,
        until: p.ends ?? p.expires,
        severity: p.severity,
        zones: p.affectedZones.map((z) => z.slice(z.lastIndexOf("/") + 1)),
      },
    ];
  });
}

export const alertsUrl = () => `https://api.weather.gov/alerts/active?area=${STATES}`;

/** The alerts covering a resort's forecast zone or county, one per event. */
export function alertsFor(resort: Resort, alerts: AreaAlert[]): NwsAlert[] {
  const nws = resort.nws;
  if (!nws) return [];
  const seen = new Set<string>();
  return alerts.flatMap(({ zones, ...alert }) => {
    if (!zones.includes(nws.zone) && !zones.includes(nws.county)) return [];
    if (seen.has(alert.event)) return [];
    seen.add(alert.event);
    return [alert];
  });
}

// ── Forecaster discussion ───────────────────────────────────────────────

export const discussionListUrl = (office: string) => `https://api.weather.gov/products/types/AFD/locations/${office}`;
export const productUrl = (id: string) => `https://api.weather.gov/products/${id}`;
export const discussionPageUrl = (office: string) =>
  `https://forecast.weather.gov/product.php?site=${office}&issuedby=${office}&product=AFD`;

/**
 * Pulls the short part of an Area Forecast Discussion. Sections start with ".TITLE..." and end
 * with "&&"; lines are hard-wrapped, so paragraphs are re-joined.
 */
export function parseDiscussion(office: string, issued: string, text: string): NwsDiscussion | null {
  const sections = new Map<string, string>();
  for (const chunk of text.split("&&")) {
    const m = chunk.match(/^\.([A-Z][A-Z /]*?)\.\.\.\s*$/m);
    if (m) sections.set(m[1].trim(), chunk.slice(chunk.indexOf(m[0]) + m[0].length));
  }
  const key = sections.has("KEY MESSAGES") ? "KEY MESSAGES" : sections.has("SYNOPSIS") ? "SYNOPSIS" : null;
  if (!key) return null;
  const paragraphs = sections
    .get(key)!
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    // "As of 216 PM EDT Monday..." only repeats the issue time.
    .filter((p) => p && !/^As of /i.test(p) && p !== "$$");
  if (paragraphs.length === 0) return null;
  return {
    office,
    issued,
    title: key === "KEY MESSAGES" ? "Key messages" : "Synopsis",
    paragraphs,
    url: discussionPageUrl(office),
  };
}

// ── Formatting ──────────────────────────────────────────────────────────

/** "Thu 7pm" in the mountain's time zone. */
export function formatAlertTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone });
  const hour = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  return `${day} ${hour.replace(":00", "").replace(" ", "").toLowerCase()}`;
}
