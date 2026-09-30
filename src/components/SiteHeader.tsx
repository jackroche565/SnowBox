"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TopTabs } from "@/components/Nav";
import Ridgeline from "@/components/Ridgeline";

/**
 * The navy bar at the top of every page: the Snowbox name and the section tabs.
 * Pass `children` for a banner below it (resort pages); it carries the ridgeline art.
 */
export default function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden bg-navy text-snow">
      <div className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl leading-none tracking-wider">
          <svg aria-hidden="true" viewBox="0 0 24 16" className="h-4 w-6">
            <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="var(--glacier)" />
            <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="var(--snow)" />
          </svg>
          Snowbox
        </Link>
        <nav aria-label="Sections">
          <TopTabs />
        </nav>
      </div>

      {children && (
        <>
          <div className="relative z-10 mx-auto max-w-7xl px-4 pt-6 pb-24 sm:pt-8 sm:pb-36">{children}</div>
          <Ridgeline />
        </>
      )}
    </header>
  );
}
