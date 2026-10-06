import { connection } from "next/server";
import { resorts } from "@/lib/resorts";

// Resorts sometimes restart a stream under a new video id. YouTube's oEmbed answers only for
// videos that exist and allow embedding, so a dead cam drops out and the page links instead.
const REVALIDATE_SECONDS = 6 * 3600;

export type CamsResponse = { working: string[] };

const oembed = (id: string) => `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;

/** The live cam video ids that are still up and embeddable. */
export async function GET() {
  await connection();
  const ids = resorts.flatMap((r) => r.liveCams?.map((c) => c.youtube) ?? []);
  const checks = await Promise.all(
    ids.map((id) =>
      fetch(oembed(id), { next: { revalidate: REVALIDATE_SECONDS } })
        .then((res) => res.ok)
        .catch(() => false),
    ),
  );
  return Response.json({ working: ids.filter((_, i) => checks[i]) } satisfies CamsResponse);
}
