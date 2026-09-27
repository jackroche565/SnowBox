"use client";

import Link from "next/link";
import { COMPARE_LIMIT, useAppState } from "@/components/AppState";
import CompareChart from "@/components/CompareChart";
import CompareTable, { type CompareEntry } from "@/components/CompareTable";
import SiteHeader from "@/components/SiteHeader";
import { getResort } from "@/lib/resorts";

export default function CompareView() {
  const { compareIds, toggleCompare, clearCompare, forecasts, distanceTo } = useAppState();

  const entries: CompareEntry[] = compareIds.flatMap((id) => {
    const resort = getResort(id);
    return resort ? [{ resort, forecast: forecasts?.[id], distance: distanceTo(resort) }] : [];
  });

  return (
    <>
      <SiteHeader
        eyebrow="Compare"
        title="Side by Side"
        subtitle={`Line up to ${COMPARE_LIMIT} resorts: snowfall, snow depth, terrain and distance.`}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pb-12">
        {entries.length === 0 ? (
          <section className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
            <svg aria-hidden="true" viewBox="0 0 120 48" className="h-12 w-32 text-glacier">
              <path d="M0 48 L28 14 L42 30 L60 6 L80 32 L94 18 L120 48 Z" fill="currentColor" opacity="0.18" />
              <path
                d="M0 48 L28 14 L42 30 L60 6 L80 32 L94 18 L120 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="mt-4 font-display text-3xl tracking-wide">Nothing to compare yet</h2>
            <p className="mt-2 max-w-sm text-sm text-ink-muted">
              Tap the <span className="font-semibold text-ink">+</span> next to any resort on Overview to add it here.
              You can line up to {COMPARE_LIMIT} at a time.
            </p>
            <Link
              href="/"
              className="mt-6 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-snow hover:bg-navy-2"
            >
              Browse resorts
            </Link>
          </section>
        ) : (
          <>
            <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 bg-snow/95 px-4 py-2 backdrop-blur">
              <p className="text-sm text-ink-muted">
                <span className="font-semibold text-ink tabular-nums">{entries.length}</span> of {COMPARE_LIMIT}{" "}
                selected
                {entries.length < COMPARE_LIMIT && (
                  <>
                    {" · "}
                    <Link href="/" className="font-medium text-glacier hover:underline">
                      Add another
                    </Link>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={clearCompare}
                className="rounded-md border border-barn px-4 py-2 text-sm font-semibold text-barn hover:bg-barn hover:text-white"
              >
                Clear all
              </button>
            </div>
            <CompareChart entries={entries} />
            <CompareTable entries={entries} onRemove={toggleCompare} />
          </>
        )}
      </main>
    </>
  );
}
