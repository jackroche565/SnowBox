import type { Metadata } from "next";
import Explore from "@/components/Explore";

export const metadata: Metadata = {
  title: "Explore · Snowbox",
};

export default function ExplorePage() {
  return <Explore />;
}
