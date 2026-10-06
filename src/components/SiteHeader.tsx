"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TopTabs } from "@/components/Nav";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink">
      <svg aria-hidden="true" viewBox="0 0 24 16" className="h-[15px] w-[22px]">
        <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="currentColor" />
        <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="var(--snow)" />
      </svg>
      <span className="type-hero text-[22px] leading-none tracking-[-0.01em] [font-stretch:75%]">Snowbox</span>
    </Link>
  );
}

/**
 * The same plain bar on every tab: the wordmark left over a 1px ink rule, plus the section tabs
 * from tablet width up. `aside` sits before the tabs; the caller decides at which widths it shows.
 */
export default function SiteHeader({ aside }: { aside?: ReactNode }) {
  return (
    <header className="relative z-20 border-b border-ink bg-snow">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pt-[18px] pb-3 sm:pb-0">
        <Wordmark />
        <nav aria-label="Sections" className="flex items-center gap-4 sm:pb-2">
          {aside}
          <TopTabs />
        </nav>
      </div>
    </header>
  );
}
