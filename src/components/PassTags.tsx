import type { Pass } from "@/lib/resorts";

/** Passes as plain text ("Epic", "Ikon · Indy"), or "Independent" for resorts on none. */
export function passText(passes: Pass[]): string {
  return passes.length ? passes.join(" · ") : "Independent";
}

/**
 * Passes as small tags: filled ink for a pass you hold, outlined otherwise. Resorts on no pass
 * say "Independent".
 */
export default function PassTags({ passes, held = [] }: { passes: Pass[]; held?: Pass[] }) {
  if (passes.length === 0) return <span className="text-[11px] text-ink-faint">Independent</span>;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {passes.map((pass) => {
        const mine = held.includes(pass);
        return (
          <span
            key={pass}
            className={`rounded-[3px] border px-1 text-[11px] leading-[15px] font-semibold ${
              mine ? "border-ink bg-ink text-snow" : "border-ink/40 text-ink-muted"
            }`}
          >
            {pass}
            {mine && <span className="sr-only"> (your pass)</span>}
          </span>
        );
      })}
    </span>
  );
}
