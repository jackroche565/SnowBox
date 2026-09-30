import type { Metadata } from "next";
import Explore from "@/components/Explore";

export const metadata: Metadata = {
  title: "Explore resorts · Snowline",
};

export default function ExplorePage() {
  return <Explore />;
}
