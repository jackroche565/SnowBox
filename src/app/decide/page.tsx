import type { Metadata } from "next";
import Decide from "@/components/Decide";

export const metadata: Metadata = {
  title: "Decide · Snowbox",
};

/** `/decide?demo=1` runs Decide on a made-up storm, for trying it while nothing is open. */
export default async function DecidePage({ searchParams }: PageProps<"/decide">) {
  const { demo } = await searchParams;
  return <Decide demo={demo === "1"} />;
}
