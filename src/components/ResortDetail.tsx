"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { COMPARE_LIMIT, useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import Estimate from "@/components/Estimate";
import PassTags from "@/components/PassTags";
import SiteHeader from "@/components/SiteHeader";
import SnowfallChart from "@/components/SnowfallChart";
import { formatFeet, formatInches, formatTemp } from "@/lib/format";
import { isEstimate, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-white p-4 sm:p-5 ${className}`}>
      <h2 className="font-display text-2xl tracking-wider">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint, estimate }: { label: string; value: ReactNode; hint?: string; estimate?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted" title={hint}>
        {label}
        {hint && <span className="ml-0.5 cursor-help">ⓘ</span>}
      </dt>
      <dd className="mt-0.5 text-2xl font-semibold tabular-nums sm:text-3xl">
        {value}
        {estimate && <Estimate />}
      </dd>
    </div>
  );
}

const LINKS = [
  { field: "trailMapUrl", label: "Trail Map" },
  { field: "snowReportUrl", label: "Snow Report" },
  { field: "webcamUrl", label: "Live Webcams" },
] as const;

export default function ResortDetail({ resort }: { resort: Resort }) {
  const { forecasts, forecastState, distanceTo, compareIds, toggleCompare } = useAppState();
  const forecast = forecasts?.[resort.id];
  const distance = distanceTo(resort);
  const inCompare = compareIds.includes(resort.id);
  const compareFull = !inCompare && compareIds.length >= COMPARE_LIMIT;

  const facts = [
    resort.summitFt && `${formatFeet(resort.summitFt)} summit`,
    resort.verticalFt && `${formatFeet(resort.verticalFt)} vertical`,
    resort.trails && `${resort.trails} trails`,
  ].filter(Boolean);

  return (
    <>
      <SiteHeader
        eyebrow={
          <>
            <Link href="/" className="hover:text-snow">
              ← All resorts
            </Link>
            <span className="text-snow/40"> · </span>
            {US_STATES[resort.state] ?? resort.state}
          </>
        }
        title={resort.name}
        subtitle={facts.join(" · ")}
      >
        <div className="mt-4 flex items-center gap-3">
          <PassTags passes={resort.passes} />
          {distance !== null && <span className="text-sm text-snow/70 tabular-nums">{Math.round(distance)} mi away</span>}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleCompare(resort.id)}
            disabled={compareFull}
            title={compareFull ? `Compare holds up to ${COMPARE_LIMIT} resorts` : undefined}
            aria-pressed={inCompare}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              inCompare ? "border border-barn bg-transparent text-snow hover:bg-barn/20" : "bg-barn text-white hover:brightness-110"
            }`}
          >
            {inCompare ? "✓ In compare" : "+ Add to compare"}
          </button>
          {LINKS.map(({ field, label }) => {
            const href = resort[field];
            if (!href) return null;
            const indirect = isEstimate(resort, field);
            return (
              <a
                key={field}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={indirect ? "This resort shows its webcams on its conditions page or app" : undefined}
                className="flex items-center gap-1.5 rounded-md border border-snow/30 px-4 py-2.5 text-sm font-medium text-snow hover:border-snow/60 hover:bg-white/5"
              >
                {label}
                {indirect && <span className="text-xs text-snow/60">(conditions page)</span>}
                <span aria-hidden="true" className="text-snow/60">↗</span>
                <span className="sr-only">(opens {resort.name}&apos;s website in a new tab)</span>
              </a>
            );
          })}
        </div>
        {inCompare && (
          <p className="mt-3 text-sm text-snow/70">
            <Link href="/compare" className="font-medium text-snow underline underline-offset-2">
              Go to Compare ({compareIds.length})
            </Link>
          </p>
        )}
      </SiteHeader>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 pb-12 lg:grid-cols-3">
        <Card title="Conditions" className="lg:col-span-3">
          {forecastState === "loading" && <p className="text-sm text-ink-muted">Loading forecast…</p>}
          {forecastState === "error" && <p className="text-sm text-ink-muted">Forecast unavailable right now.</p>}
          {forecast && (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Now" value={<CountUp value={forecast.tempF} format={formatTemp} />} />
              <Stat
                label="Snow depth"
                hint="Modeled snow on the ground from Open-Meteo, not the resort's reported base depth."
                value={<CountUp value={forecast.snowDepthIn} format={formatInches} />}
              />
              <Stat label="Last 7 days" value={formatInches(forecast.past7In)} />
              <Stat label="Next 7 days" value={formatInches(forecast.next7In)} />
            </dl>
          )}
        </Card>

        <Card title="7-Day Snowfall" className="lg:col-span-2">
          {forecast ? (
            <SnowfallChart days={forecast.upcoming} />
          ) : (
            <p className="text-sm text-ink-muted">{forecastState === "loading" ? "Loading forecast…" : "Forecast unavailable right now."}</p>
          )}
        </Card>

        <Card title="The Mountain">
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="Summit" value={formatFeet(resort.summitFt)} estimate={isEstimate(resort, "summitFt")} />
            <Stat label="Base" value={formatFeet(resort.baseFt)} estimate={isEstimate(resort, "baseFt")} />
            <Stat label="Vertical drop" value={formatFeet(resort.verticalFt)} estimate={isEstimate(resort, "verticalFt")} />
            <Stat label="Trails" value={resort.trails ?? "—"} estimate={isEstimate(resort, "trails")} />
          </dl>
          <p className="mt-4 text-xs text-ink-muted">
            Lift-served figures from published resort stats. Check the resort&apos;s trail map for the latest.
          </p>
        </Card>
      </main>
    </>
  );
}
