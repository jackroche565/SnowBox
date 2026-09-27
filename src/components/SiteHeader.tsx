"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import Ridgeline from "@/components/Ridgeline";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/compare", label: "Compare" },
];

type Props = {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
};

/** The navy band at the top of every page: brand, section tabs, then the page's own hero. */
export default function SiteHeader({ eyebrow, title, subtitle, children }: Props) {
  const pathname = usePathname();
  const { compareIds } = useAppState();

  return (
    <header className="relative overflow-hidden bg-navy text-snow">
      <nav
        aria-label="Main"
        className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-white/10 px-4 py-3"
      >
        <Link href="/" className="flex items-center gap-2 font-display text-2xl leading-none tracking-wider">
          <svg aria-hidden="true" viewBox="0 0 24 16" className="h-4 w-6">
            <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="var(--glacier)" />
            <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="var(--snow)" />
          </svg>
          Snowline
        </Link>
        <ul className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "text-snow" : "text-snow/65 hover:text-snow"
                  }`}
                >
                  {tab.label}
                  {tab.href === "/compare" && compareIds.length > 0 && (
                    <span className="rounded-sm bg-barn px-1.5 text-xs leading-5 font-semibold text-white tabular-nums">
                      {compareIds.length}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-3 -bottom-3 h-0.5 bg-alpenglow transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-32 sm:pt-10 sm:pb-44">
        <div className="text-xs font-semibold tracking-[0.2em] text-glacier uppercase">{eyebrow}</div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide sm:text-8xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-snow/70 sm:text-base">{subtitle}</p>}
        {children}
      </div>
      <Ridgeline />
    </header>
  );
}
