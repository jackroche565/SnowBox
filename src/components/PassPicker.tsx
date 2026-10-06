"use client";

import { useAppState } from "@/components/AppState";
import { PASSES } from "@/lib/resorts";

/**
 * Toggle the passes you hold, as text: a pass you hold is ink, bold and underlined. None selected
 * means every resort shows. Saved in this browser.
 */
export default function PassPicker({ className = "" }: { className?: string }) {
  const { myPasses, togglePass } = useAppState();

  return (
    <div role="group" aria-label="My passes" className={`flex items-center gap-3.5 ${className}`}>
      {PASSES.map((pass) => {
        const on = myPasses.includes(pass);
        return (
          <button
            key={pass}
            type="button"
            aria-pressed={on}
            onClick={() => togglePass(pass)}
            className={`border-b-2 pb-0.5 text-[14px] ${on ? "border-ink font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {pass}
          </button>
        );
      })}
    </div>
  );
}
