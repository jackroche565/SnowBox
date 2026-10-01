"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { DecideIcon, HomeIcon, MapIcon } from "@/components/Icons";

type Tab = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

export const TABS: Tab[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: MapIcon },
  { href: "/decide", label: "Decide", icon: DecideIcon },
];

export function useActiveTab(): string | null {
  const pathname = usePathname();
  // Resort pages sit under Explore, where people find them.
  if (pathname.startsWith("/resorts")) return "/explore";
  return TABS.find((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)))?.href ?? null;
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
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                current ? "font-semibold text-ink" : "font-medium text-ink-faint hover:text-ink"
              }`}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-alpenglow transition-opacity ${
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
      className="fixed inset-x-0 bottom-0 z-[1200] border-t border-line bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: TabIcon }) => {
          const current = href === active;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex flex-col items-center gap-[3px] pt-2.5 pb-2 text-[11px] ${
                  current ? "font-semibold text-ink" : "font-medium text-ink-faint"
                }`}
              >
                <TabIcon className="h-6 w-6" />
                {label}
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-[18px] rounded-full bg-alpenglow ${current ? "opacity-100" : "opacity-0"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
