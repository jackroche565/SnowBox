import { PASS_COLORS } from "@/lib/format";
import type { Pass } from "@/lib/resorts";

export default function PassTags({ passes }: { passes: Pass[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {passes.map((pass) => (
        <span key={pass} className="pass-patch" style={{ backgroundColor: PASS_COLORS[pass] }}>
          <span>{pass}</span>
        </span>
      ))}
    </span>
  );
}
