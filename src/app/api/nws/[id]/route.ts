import { connection, type NextRequest } from "next/server";
import {
  NWS_HEADERS,
  alertsFor,
  alertsUrl,
  discussionListUrl,
  parseAlerts,
  parseDiscussion,
  productUrl,
  type NwsDiscussion,
  type ResortNws,
} from "@/lib/nws";
import { getResort } from "@/lib/resorts";

const ALERTS_SECONDS = 600;
/** Offices issue a new discussion every few hours. */
const DISCUSSION_SECONDS = 1800;
/** The weather service can be slow; give up rather than leave the page waiting. */
const TIMEOUT_MS = 10_000;

async function latestDiscussion(office: string): Promise<NwsDiscussion | null> {
  const list = await fetch(discussionListUrl(office), { headers: NWS_HEADERS, next: { revalidate: DISCUSSION_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!list.ok) return null;
  const latest = (await list.json())["@graph"]?.[0] as { id: string } | undefined;
  if (!latest) return null;
  // A product never changes once issued.
  const product = await fetch(productUrl(latest.id), { headers: NWS_HEADERS, next: { revalidate: 86400 }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!product.ok) return null;
  const { issuanceTime, productText } = (await product.json()) as { issuanceTime: string; productText: string };
  return parseDiscussion(office, issuanceTime, productText);
}

/** One resort's active warnings and its local office's latest forecaster discussion. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/nws/[id]">) {
  await connection();
  const resort = getResort((await ctx.params).id);
  if (!resort?.nws) return Response.json({ error: "Unknown resort" }, { status: 404 });

  const [alerts, discussion] = await Promise.all([
    fetch(alertsUrl(), { headers: NWS_HEADERS, next: { revalidate: ALERTS_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (res) => (res.ok ? alertsFor(resort, parseAlerts(await res.json())) : []))
      .catch(() => []),
    latestDiscussion(resort.nws.office).catch(() => null),
  ]);
  return Response.json({ alerts, discussion } satisfies ResortNws);
}
