"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

export const TABS: Tab[] = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/decide", label: "Decide" },
];

export function useActiveTab(): string | null {
  const pathname = usePathname();
  // Resort pages sit under Explore, where people find them.
  if (pathname.startsWith("/resorts")) return "/explore";
  return TABS.find((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)))?.href ?? null;
}

/** Section tabs in the header, shown from tablet width up. Selected: bold with an ink underline. */
export function TopTabs() {
  const active = useActiveTab();
  return (
    <ul className="hidden items-center gap-5 sm:flex">
      {TABS.map((tab) => {
        const current = tab.href === active;
        return (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={`type-name block border-b-[3px] pb-1 text-[15px] ${
                current ? "border-ink font-extrabold text-ink" : "border-transparent font-semibold text-ink-faint hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Text tab bar pinned to the bottom of the screen on phones. Active: heavier, with an ink bar on top. */
export function BottomNav() {
  const active = useActiveTab();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[1200] border-t border-rule bg-snow pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label }) => {
          const current = href === active;
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`type-name -mt-px flex h-[3.75rem] items-center border-t-[3px] px-3 text-[15px] ${
                  current ? "border-ink font-extrabold text-ink" : "border-transparent font-semibold text-ink-faint"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
