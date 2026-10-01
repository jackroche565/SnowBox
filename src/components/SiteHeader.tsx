"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TopTabs } from "@/components/Nav";

type Props = {
  /** "bar" sits on the page; "overlay" floats transparently over a terrain image. */
  variant?: "bar" | "overlay";
  /** Hide the bar on phones (resort pages float their own back and save buttons there). */
  hideOnPhone?: boolean;
  /** Small text on the right on phones, where the tabs live in the bottom bar. */
  aside?: ReactNode;
};

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink">
      <svg aria-hidden="true" viewBox="0 0 24 16" className="h-[15px] w-[22px]">
        <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="currentColor" />
        <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="#fff" />
      </svg>
      <span className="type-hero text-[21px] leading-none tracking-[-0.01em] [font-stretch:80%]">Snowbox</span>
    </Link>
  );
}

/** The top bar on every page: the Snowbox wordmark, plus the section tabs from tablet width up. */
export default function SiteHeader({ variant = "bar", hideOnPhone = false, aside }: Props) {
  const overlay = variant === "overlay";
  return (
    <header
      className={`${overlay ? "absolute inset-x-0 top-0 z-20" : "relative"} ${hideOnPhone ? "hidden sm:block" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-[18px] pb-3">
        <Wordmark />
        <nav aria-label="Sections" className="flex items-center gap-4">
          {aside && <span className="text-[13px] text-ink-muted sm:hidden">{aside}</span>}
          <TopTabs />
        </nav>
      </div>
    </header>
  );
}
