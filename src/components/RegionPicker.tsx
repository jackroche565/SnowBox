"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAppState } from "@/components/AppState";
import { REGIONS, regionLabel, resortsIn } from "@/lib/regions";

/** Which region Explore and Decide show, as one dropdown. Saved in this browser and shared across tabs. */
export default function RegionPicker({ className = "", align = "left" }: { className?: string; align?: "left" | "right" }) {
  const { region, setRegion } = useAppState();
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
        aria-label={`Region: ${regionLabel(region)}`}
        onClick={() => setOpen((v) => !v)}
        className="type-name flex items-center gap-1 border-b-2 border-ink pb-0.5 text-[17px] whitespace-nowrap"
      >
        {regionLabel(region)}
        <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9 L12 15 L18 9" />
        </svg>
      </button>

      {open && (
        <ul
          id={panelId}
          role="listbox"
          aria-label="Region"
          className={`absolute top-full z-[1150] mt-2 w-60 border border-ink bg-snow py-1 shadow-[0_8px_24px_rgb(15_26_42/0.14)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {REGIONS.map((r) => {
            const on = r.id === region;
            return (
              <li key={r.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    setRegion(r.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-[15px] hover:bg-white/60 ${on ? "font-bold" : ""}`}
                >
                  {r.label}
                  <span className="text-[12px] font-normal text-ink-faint tabular-nums">{resortsIn(r.id).length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
