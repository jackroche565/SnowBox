"use client";

import { useAppState } from "@/components/AppState";
import { PASS_COLORS } from "@/lib/format";
import { PASSES } from "@/lib/resorts";

/** Toggle the passes you hold. None selected means every resort shows. Saved in this browser. */
export default function PassPicker({ className = "" }: { className?: string }) {
  const { myPasses, togglePass } = useAppState();

  return (
    <div role="group" aria-label="My passes" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {PASSES.map((pass) => {
        const on = myPasses.includes(pass);
        return (
          <button
            key={pass}
            type="button"
            aria-pressed={on}
            onClick={() => togglePass(pass)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              on ? "border-transparent text-white" : "border-line bg-white text-ink-muted hover:text-ink"
            }`}
            style={on ? { backgroundColor: PASS_COLORS[pass] } : undefined}
          >
            {pass}
          </button>
        );
      })}
      <span className="ml-1 text-xs text-ink-muted">{myPasses.length === 0 ? "All resorts" : "Your passes"}</span>
    </div>
  );
}
