"use client";

import { createContext, useContext, useLayoutEffect, useRef } from "react";

/** True for a moment after forecasts first load; numbers mounted then count up. */
export const CountUpContext = createContext(false);

const DURATION_MS = 700;

type Props = {
  value: number | null;
  format: (value: number | null) => string;
};

export default function CountUp({ value, format }: Props) {
  const animate = useContext(CountUpContext);
  const ref = useRef<HTMLSpanElement>(null);

  // Runs once on mount, before paint, so the final value never flashes first.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !animate || value == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = format(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    el.textContent = format(0);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = format(value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count up only on first appearance
  }, []);

  return <span ref={ref}>{format(value)}</span>;
}
