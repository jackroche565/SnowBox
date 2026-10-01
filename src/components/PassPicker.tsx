"use client";

import { useAppState } from "@/components/AppState";
import { PASS_COLORS } from "@/lib/format";
import { PASSES } from "@/lib/resorts";

/**
 * Toggle the passes you hold. None selected means every resort shows. Saved in this browser.
 * "floating" pills sit over the map; the default sits on a sheet.
 */
export default function PassPicker({ floating = false, className = "" }: { floating?: boolean; className?: string }) {
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
            className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors ${
              on
                ? "bg-ink text-white"
                : floating
                  ? "bg-white text-ink shadow-[0_1px_4px_rgb(15_26_42/0.12)] hover:bg-snow"
                  : "bg-chip text-ink hover:bg-line"
            }`}
          >
            <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: PASS_COLORS[pass] }} />
            {pass}
          </button>
        );
      })}
    </div>
  );
}
