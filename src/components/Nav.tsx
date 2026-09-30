"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useAppState } from "@/components/AppState";
import { CompareIcon, HomeIcon, MapIcon } from "@/components/Icons";

type Tab = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

export const TABS: Tab[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: MapIcon },
  { href: "/compare", label: "Compare", icon: CompareIcon },
];

export function useActiveTab(): string | null {
  const pathname = usePathname();
  // Resort pages sit under Explore, where people find them.
  if (pathname.startsWith("/resorts")) return "/explore";
  return TABS.find((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)))?.href ?? null;
}

function CompareBadge({ className = "" }: { className?: string }) {
  const { compareIds } = useAppState();
  if (compareIds.length === 0) return null;
  return (
    <span className={`rounded-sm bg-barn px-1.5 text-xs leading-5 font-semibold text-white tabular-nums ${className}`}>
      {compareIds.length}
    </span>
  );
}

/** Section tabs in the navy header, shown from tablet width up. */
export function TopTabs() {
  const active = useActiveTab();
  return (
    <ul className="hidden items-center gap-1 sm:flex">
      {TABS.map((tab) => {
        const current = tab.href === active;
        return (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                current ? "text-snow" : "text-snow/65 hover:text-snow"
              }`}
            >
              {tab.label}
              {tab.href === "/compare" && <CompareBadge />}
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 -bottom-3 h-0.5 bg-alpenglow transition-opacity ${
                  current ? "opacity-100" : "opacity-0"
                }`}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** App-style tab bar pinned to the bottom of the screen on phones. */
export function BottomNav() {
  const active = useActiveTab();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[1200] border-t border-white/10 bg-navy/95 pb-[env(safe-area-inset-bottom)] text-snow backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: TabIcon }) => {
          const current = href === active;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${
                  current ? "text-snow" : "text-snow/55"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-8 top-0 h-0.5 bg-alpenglow transition-opacity ${
                    current ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="relative">
                  <TabIcon className="h-6 w-6" />
                  {href === "/compare" && <CompareBadge className="absolute -top-1 -right-3 text-[10px] leading-4" />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
