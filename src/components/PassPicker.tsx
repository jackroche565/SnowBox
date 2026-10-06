"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAppState } from "@/components/AppState";
import { INDEPENDENT, PASS_FILTERS, type PassFilter } from "@/lib/resorts";

/** "Any pass", "Ikon", "Epic, Ikon", "3 passes", "All passes". */
function summary(chosen: PassFilter[]): string {
  if (chosen.length === 0) return "Any pass";
  if (chosen.length === PASS_FILTERS.length) return "All passes";
  if (chosen.length <= 2) return chosen.join(", ");
  return `${chosen.length} chosen`;
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 border-ink ${on ? "bg-ink" : ""}`}>
      {on && (
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-snow" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 L10 17 L19 7" />
        </svg>
      )}
    </span>
  );
}

/**
 * Which passes to show, as one dropdown: a check per pass plus Independent (on no pass), with All
 * and Clear. Nothing chosen means every mountain. Saved in this browser and shared across tabs.
 */
export default function PassPicker({ className = "", align = "right" }: { className?: string; align?: "left" | "right" }) {
  const { myPasses, togglePass, setPasses } = useAppState();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Close on a tap outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 border-b-2 border-ink pb-0.5 text-[14px] font-semibold whitespace-nowrap"
      >
        {summary(myPasses)}
        <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9 L12 15 L18 9" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Passes"
          className={`absolute top-full z-[1150] mt-2 w-60 border border-ink bg-snow shadow-[0_8px_24px_rgb(15_26_42/0.14)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-rule px-3 py-2 text-[14px]">
            <button type="button" onClick={() => setPasses([...PASS_FILTERS])} className="font-semibold underline underline-offset-4">
              All
            </button>
            <button
              type="button"
              onClick={() => setPasses([])}
              disabled={myPasses.length === 0}
              className="font-semibold underline underline-offset-4 disabled:no-underline disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <ul className="py-1">
            {PASS_FILTERS.map((pass) => {
              const on = myPasses.includes(pass);
              return (
                <li key={pass}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => togglePass(pass)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[15px] hover:bg-white/60 ${
                      pass === INDEPENDENT ? "mt-1 border-t border-rule pt-2.5" : ""
                    }`}
                  >
                    <Check on={on} />
                    <span className={on ? "font-semibold" : ""}>
                      {pass}
                      {pass === INDEPENDENT && <span className="block text-[12px] font-normal text-ink-muted">On no pass</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
