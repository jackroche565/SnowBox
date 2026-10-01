"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import Estimate from "@/components/Estimate";
import FavoriteButton from "@/components/FavoriteButton";
import HourlyChart, { HourlyLegend } from "@/components/HourlyChart";
import { ExternalIcon, WindIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import { sum, type DailyForecast, type ResortForecast } from "@/lib/forecast";
import { formatDay, formatFeet, formatInches, formatTemp } from "@/lib/format";
import { last48In } from "@/lib/outlook";
import {
  MODELS,
  WIND_HOLD_MPH,
  snowLine,
  toBlocks,
  type ResortDetailForecast,
  type SnowLine,
} from "@/lib/resortForecast";
import { isEstimate, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

// One page, most-checked first: recent snow, base, the next few days, wind, and where to find
// lifts and trails. Deeper detail (hour by hour) is folded away.

/** Total model spread over days 8–16 above this reads as "models disagree". */
const DISAGREE_INCHES = 2;
/** Bars in the 7-day list share a floor so a dusting doesn't fill the row. */
const DAY_SCALE_INCHES = 6;

function Card({ label, aside, children, className = "" }: { label: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={`min-w-0 rounded-lg border border-line bg-white p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{label}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, hint }: { label: string; value: ReactNode; sub?: ReactNode; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted" title={hint}>
        {label}
        {hint && <span className="ml-0.5 cursor-help">ⓘ</span>}
      </dt>
      <dd className="mt-0.5 text-3xl font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs">{sub}</dd>}
    </div>
  );
}

function Pending({ state, what = "forecast" }: { state: "loading" | "error" | "ready"; what?: string }) {
  return (
    <p className="text-sm text-ink-muted">
      {state === "error" ? `The ${what} is unavailable right now. Try again in a few minutes.` : `Loading ${what}…`}
    </p>
  );
}

// ── Detailed forecast (hourly + models) ───────────────────────────────

type DetailState = { status: "loading" | "error" | "ready"; data: ResortDetailForecast | null };

function useResortDetail(id: string): DetailState {
  const [state, setState] = useState<DetailState>({ status: "loading", data: null });
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/resort/${id}`)
      .then((res) => (res.ok ? (res.json() as Promise<ResortDetailForecast>) : Promise.reject()))
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch(() => !cancelled && setState({ status: "error", data: null }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state;
}

const SNOW_LINE: Record<SnowLine, { text: string; tone: string }> = {
  "all-snow": { text: "Snow top to bottom", tone: "border-glacier bg-glacier/10" },
  "rain-below": { text: "Rain at the base, snow at the summit", tone: "border-[#9a7fc4] bg-[#9a7fc4]/10" },
  "all-rain": { text: "Rain or mix up to the summit", tone: "border-[#7a8699] bg-[#7a8699]/10" },
  dry: { text: "Dry", tone: "border-line bg-snow" },
};

// ── Sections ──────────────────────────────────────────────────────────

function Conditions({ resort, forecast, detail }: { resort: Resort; forecast: ResortForecast; detail: DetailState }) {
  const gust = forecast.upcoming[0]?.gustMph ?? null;
  const report = resort.snowReportUrl ?? resort.websiteUrl;
  const line = detail.data && SNOW_LINE[snowLine(detail.data.summit, detail.data.base)];

  return (
    <Card label="Conditions" aside={<span className="text-sm text-ink-muted tabular-nums">Now <span className="font-semibold text-ink"><CountUp value={forecast.tempF} format={formatTemp} /></span></span>}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
        <Stat label="Last 48 hrs" value={formatInches(last48In(forecast))} />
        <Stat label="Last 7 days" value={formatInches(forecast.past7In)} />
        <Stat
          label="Base"
          hint="Modeled snow on the ground from Open-Meteo, not the resort's reported base depth."
          value={
            <>
              <CountUp value={forecast.snowDepthIn} format={formatInches} />
              <Estimate note="Modeled, not resort-reported" />
            </>
          }
        />
        <Stat label="Next 3 days" value={formatInches(forecast.next3In)} />
        <Stat
          label="Wind today"
          value={gust == null ? "—" : `${Math.round(gust)} mph`}
          sub={gust != null && gust >= WIND_HOLD_MPH ? <span className="font-semibold text-barn">Lift holds possible</span> : "Peak gusts"}
        />
      </dl>

      {line && (
        <p className={`mt-4 rounded-md border-l-4 px-3 py-2 text-sm ${line.tone}`}>
          <span className="text-ink-muted">Next 72 hours: </span>
          <span className="font-semibold">{line.text}</span>
        </p>
      )}

      {report && (
        <a
          href={report}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5 hover:border-glacier"
        >
          <span>
            <span className="block text-sm font-semibold">Lifts & trails open</span>
            <span className="block text-xs text-ink-muted">Reported by {resort.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-glacier">
            Official report <ExternalIcon className="h-3.5 w-3.5" />
          </span>
        </a>
      )}
    </Card>
  );
}

function DayRow({ day, index }: { day: DailyForecast; index: number }) {
  const snow = day.snowIn ?? 0;
  const rain = day.rainIn ?? 0;
  const windy = day.gustMph != null && day.gustMph >= WIND_HOLD_MPH;
  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2 border-b border-line py-2.5 text-sm tabular-nums last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)_5rem_6rem]">
      <span className="font-medium">{formatDay(day.date, index)}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={`w-9 shrink-0 font-semibold ${snow >= 0.1 ? "text-ink" : "text-ink-muted"}`}>{formatInches(day.snowIn)}</span>
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/50">
          {snow > 0 && (
            <span
              className="block h-full rounded-full bg-glacier"
              style={{ width: `${Math.min(100, Math.max(4, (snow / DAY_SCALE_INCHES) * 100))}%` }}
            />
          )}
        </span>
        {rain >= 0.05 && <span className="shrink-0 text-xs text-[#5f6b7c]">Rain {rain.toFixed(2)}&Prime;</span>}
      </span>
      <span className="text-right text-ink-muted">
        <span className="text-ink">{formatTemp(day.highF)}</span> / {formatTemp(day.lowF)}
      </span>
      <span className={`flex items-center justify-end gap-1 ${windy ? "font-semibold text-barn" : "text-ink-muted"}`}>
        <WindIcon className="h-3.5 w-3.5" />
        {day.gustMph == null ? "—" : Math.round(day.gustMph)}
        <span className="hidden sm:inline">mph</span>
      </span>
    </li>
  );
}

function Forecast({ forecast, detail }: { forecast: ResortForecast; detail: DetailState }) {
  // Week two: one line, with whether the three models agree.
  const late = detail.data?.models.slice(7) ?? [];
  const totals = MODELS.map((m) => sum(late.map((d) => d.byModel[m.id])));
  const spread = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return (
    <Card label="Next 7 days">
      <ul>
        {forecast.upcoming.map((d, i) => (
          <DayRow key={d.date} day={d} index={i} />
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-muted">
        Days 8–16: <span className="font-semibold text-ink tabular-nums">{formatInches(forecast.days8to16In)}</span>
        {detail.data && (spread >= DISAGREE_INCHES ? " · models disagree" : " · models agree")}
        <span> · long range, low confidence</span>
      </p>
      <p className="mt-1 text-xs text-ink-muted">Temperatures and wind at the mountain&apos;s grid point. Wind shows peak gusts.</p>
    </Card>
  );
}

function HourByHour({ resort, detail }: { resort: Resort; detail: DetailState }) {
  const [elevation, setElevation] = useState<"summit" | "base">("summit");
  return (
    <details className="group rounded-lg border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold sm:px-5">
        Hour by hour, next 72 hours
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-line px-4 pt-3 pb-4 sm:px-5">
        {detail.data ? (
          <>
            <SegmentedControl
              label="Elevation"
              value={elevation}
              onChange={setElevation}
              className="w-fit"
              segments={[
                { value: "summit", label: `Summit ${formatFeet(resort.summitFt)}` },
                { value: "base", label: `Base ${formatFeet(resort.baseFt)}` },
              ]}
            />
            <div className="mt-4">
              <HourlyChart blocks={toBlocks(detail.data[elevation].hours)} />
            </div>
            <div className="mt-3">
              <HourlyLegend />
            </div>
          </>
        ) : (
          <Pending state={detail.status} what="hourly forecast" />
        )}
      </div>
    </details>
  );
}

const LINKS = [
  { field: "webcamUrl", label: "Webcams" },
  { field: "trailMapUrl", label: "Trail map" },
  { field: "snowReportUrl", label: "Snow report" },
  { field: "websiteUrl", label: "Website" },
] as const;

function MountainFacts({ resort }: { resort: Resort }) {
  const facts = [
    { field: "summitFt", label: "Summit", value: formatFeet(resort.summitFt) },
    { field: "baseFt", label: "Base", value: formatFeet(resort.baseFt) },
    { field: "verticalFt", label: "Vertical", value: formatFeet(resort.verticalFt) },
    { field: "trails", label: "Trails", value: resort.trails ?? "—" },
  ] as const;

  return (
    <Card label="The mountain">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.field}>
            <dt className="text-xs text-ink-muted">{f.label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {f.value}
              {isEstimate(resort, f.field) && <Estimate />}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 flex flex-wrap gap-2">
        {LINKS.map(({ field, label }) => {
          const href = resort[field];
          if (!href) return null;
          return (
            <li key={field}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-glacier"
              >
                {label}
                <ExternalIcon className="h-3.5 w-3.5 text-ink-muted" />
                <span className="sr-only">(opens {resort.name}&apos;s website in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ResortDetail({ resort }: { resort: Resort }) {
  const { forecasts, forecastState, distanceTo } = useAppState();
  const detail = useResortDetail(resort.id);
  const forecast = forecasts?.[resort.id];
  const distance = distanceTo(resort);

  const facts = (
    [
      ["summitFt", resort.summitFt && `${formatFeet(resort.summitFt)} summit`],
      ["verticalFt", resort.verticalFt && `${formatFeet(resort.verticalFt)} vertical`],
      ["trails", resort.trails && `${resort.trails} trails`],
    ] as const
  ).flatMap(([field, text]) => (text ? [{ field, text }] : []));

  return (
    <>
      <SiteHeader>
        <div className="text-xs font-semibold tracking-[0.2em] text-glacier uppercase">
          <Link href="/explore" className="hover:text-snow">
            ← Explore
          </Link>
          <span className="text-snow/40"> · </span>
          {US_STATES[resort.state] ?? resort.state}
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide sm:text-7xl">{resort.name}</h1>
        <p className="mt-2 text-sm text-snow/70 tabular-nums sm:text-base">
          {facts.map(({ field, text }, i) => (
            <span key={field}>
              {i > 0 && " · "}
              {text}
              {isEstimate(resort, field) && <span className="ml-1 text-xs text-snow/50">est.</span>}
            </span>
          ))}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PassTags passes={resort.passes} />
          {distance !== null && <span className="text-sm text-snow/70 tabular-nums">{Math.round(distance)} mi away</span>}
          <FavoriteButton id={resort.id} name={resort.name} tone="dark" withLabel />
        </div>
      </SiteHeader>

      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-4 px-4 pt-4 pb-12">
        {forecast ? (
          <>
            <Conditions resort={resort} forecast={forecast} detail={detail} />
            <Forecast forecast={forecast} detail={detail} />
          </>
        ) : (
          <div className="rounded-lg border border-line bg-white p-4">
            <Pending state={forecastState} />
          </div>
        )}
        <HourByHour resort={resort} detail={detail} />
        <MountainFacts resort={resort} />
        <p className="text-xs text-ink-muted">
          Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>{" "}
          (GFS, ECMWF and GEM models), refreshed every 30 minutes. Snow and base are modeled, not resort-reported.
        </p>
      </main>
    </>
  );
}
