import type { Metadata } from "next";
import CompareView from "@/components/CompareView";

export const metadata: Metadata = {
  title: "Compare resorts · Snowline",
};

export default function ComparePage() {
  return <CompareView />;
}
