import { PASS_COLORS } from "@/lib/format";
import type { Pass } from "@/lib/resorts";

export default function PassTags({ passes }: { passes: Pass[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {passes.map((pass) => (
        <span
          key={pass}
          className="rounded px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white"
          style={{ backgroundColor: PASS_COLORS[pass] }}
        >
          {pass}
        </span>
      ))}
    </span>
  );
}
