import type { Metadata } from "next";
import Decide from "@/components/Decide";

export const metadata: Metadata = {
  title: "Decide · Snowbox",
};

export default function DecidePage() {
  return <Decide />;
}
