"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TopTabs } from "@/components/Nav";
import Ridgeline from "@/components/Ridgeline";

type Props = {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  /** "hero" carries the ridgeline artwork; "compact" is a slim band for working pages. */
  size?: "hero" | "compact";
};

/** The navy band at the top of every page: brand, section tabs, then the page's own heading. */
export default function SiteHeader({ eyebrow, title, subtitle, children, size = "hero" }: Props) {
  const hero = size === "hero";

  return (
    <header className="relative overflow-hidden bg-navy text-snow">
      <div className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl leading-none tracking-wider">
          <svg aria-hidden="true" viewBox="0 0 24 16" className="h-4 w-6">
            <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="var(--glacier)" />
            <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="var(--snow)" />
          </svg>
          Snowline
        </Link>
        <nav aria-label="Sections">
          <TopTabs />
        </nav>
      </div>

      <div
        className={`relative z-10 mx-auto max-w-7xl px-4 ${hero ? "pt-8 pb-28 sm:pt-10 sm:pb-40" : "pt-5 pb-6 sm:pt-6 sm:pb-8"}`}
      >
        <div className="text-xs font-semibold tracking-[0.2em] text-glacier uppercase">{eyebrow}</div>
        <h1
          className={`mt-1 font-display leading-none tracking-wide ${hero ? "text-5xl sm:text-8xl" : "text-4xl sm:text-5xl"}`}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-snow/70 sm:text-base">{subtitle}</p>}
        {children}
      </div>
      {hero && <Ridgeline />}
    </header>
  );
}
