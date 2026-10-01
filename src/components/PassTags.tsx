import { PASS_COLORS } from "@/lib/format";
import type { Pass } from "@/lib/resorts";

/** Each pass as a small colored dot and its name. */
export default function PassTags({ passes, tone = "light" }: { passes: Pass[]; tone?: "light" | "dark" }) {
  if (passes.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      {passes.map((pass) => (
        <span
          key={pass}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${tone === "dark" ? "text-snow/80" : "text-ink-muted"}`}
        >
          <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: PASS_COLORS[pass] }} />
          {pass}
        </span>
      ))}
    </span>
  );
}
