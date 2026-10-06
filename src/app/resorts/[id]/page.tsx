import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ResortDetail from "@/components/ResortDetail";
import { getResort, resorts } from "@/lib/resorts";

// Every resort page is built ahead of time; unknown ids are a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return resorts.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: PageProps<"/resorts/[id]">): Promise<Metadata> {
  const resort = getResort((await params).id);
  if (!resort) return {};
  return {
    title: `${resort.name} · Snowbox`,
    description: `Snow forecast and conditions for ${resort.name}, ${resort.state}.`,
  };
}

export default async function ResortPage({ params }: PageProps<"/resorts/[id]">) {
  const resort = getResort((await params).id);
  if (!resort) notFound();
  return <ResortDetail resort={resort} />;
}
