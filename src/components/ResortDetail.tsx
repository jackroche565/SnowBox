"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import DailySnow from "@/components/DailySnow";
import Estimate from "@/components/Estimate";
import FavoriteButton from "@/components/FavoriteButton";
import HourlyChart, { HourlyLegend } from "@/components/HourlyChart";
import { ExternalIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import SnowfallChart, { type ChartDay } from "@/components/SnowfallChart";
import { sum, type ResortForecast } from "@/lib/forecast";
import { formatDay, formatFeet, formatInches, formatShortDate, formatTemp } from "@/lib/format";
import {
  MODELS,
  WIND_HOLD_MPH,
  snowLine,
  toBlocks,
  type ElevationForecast,
  type ResortDetailForecast,
  type SnowLine,
} from "@/lib/resortForecast";
import { isEstimate, type Resort } from "@/lib/resorts";
import { US_STATES } from "@/lib/usStates";

// ── Building blocks ───────────────────────────────────────────────────

function Card({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-white p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{title}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint, estimate, sub }: { label: string; value: ReactNode; hint?: string; estimate?: boolean; sub?: ReactNode }) {
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
      {sub && <dd className="text-xs text-ink-muted">{sub}</dd>}
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

const LINKS = [
  { field: "snowReportUrl", label: "Snow report", blurb: "Lifts, trails, grooming, base depth." },
  { field: "webcamUrl", label: "Webcams", blurb: "Live mountain cams." },
  { field: "trailMapUrl", label: "Trail map", blurb: "Current trail map." },
] as const;

// ── Tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "forecast", label: "Forecast" },
  { id: "report", label: "Report & Cams" },
  { id: "mountain", label: "Mountain" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** The open tab, remembered in the URL hash so it survives a reload and can be shared. */
function useHashTab(): [TabId, (tab: TabId) => void] {
  const [tab, setTab] = useState<TabId>("forecast");
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      setTab(TABS.some((t) => t.id === hash) ? (hash as TabId) : "forecast");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const select = (next: TabId) => {
    setTab(next);
    history.replaceState(null, "", next === "forecast" ? window.location.pathname : `#${next}`);
  };
  return [tab, select];
}

// ── Detailed forecast ─────────────────────────────────────────────────

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

const SNOW_LINE: Record<SnowLine, { title: string; detail: string; tone: string }> = {
  "all-snow": {
    title: "Snow top to bottom",
    detail: "All precipitation in the next 72 hours falls as snow at summit and base.",
    tone: "border-glacier bg-glacier/10",
  },
  "rain-below": {
    title: "Rain at the base, snow at the summit",
    detail: "Rain or mix at the base; snow at the summit.",
    tone: "border-[#9a7fc4] bg-[#9a7fc4]/10",
  },
  "all-rain": {
    title: "Rain or mix to the summit",
    detail: "Above freezing at the summit during precipitation.",
    tone: "border-[#7a8699] bg-[#7a8699]/10",
  },
  dry: {
    title: "Dry for 72 hours",
    detail: "No precipitation forecast at summit or base.",
    tone: "border-line bg-snow",
  },
};

function NextHours({ detail, resort }: { detail: ResortDetailForecast; resort: Resort }) {
  const [elevation, setElevation] = useState<"summit" | "base">("summit");
  const e: ElevationForecast = detail[elevation];
  const blocks = toBlocks(e.hours);
  const line = SNOW_LINE[snowLine(detail.summit, detail.base)];

  const snow = sum(e.hours.map((h) => h.snowIn));
  const rain = sum(e.hours.filter((h) => h.kind === "rain").map((h) => h.precipIn));
  const gusts = e.hours.map((h) => h.gustMph).filter((g): g is number => g != null);
  const peakGust = gusts.length ? Math.max(...gusts) : null;
  const freezing = e.hours
    .filter((h) => h.freezingLevelFt != null)
    .reduce<(typeof e.hours)[number] | null>((low, h) => (!low || h.freezingLevelFt! < low.freezingLevelFt! ? h : low), null);

  return (
    <Card
      title="Next 72 Hours"
      aside={
        <SegmentedControl
          label="Elevation"
          value={elevation}
          onChange={setElevation}
          segments={[
            { value: "summit", label: `Summit ${formatFeet(resort.summitFt)}` },
            { value: "base", label: `Base ${formatFeet(resort.baseFt)}` },
          ]}
        />
      }
    >
      <div className={`rounded-md border-l-4 px-3 py-2 ${line.tone}`}>
        <p className="text-sm font-semibold">{line.title}</p>
        <p className="text-xs text-ink-muted">{line.detail}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Snow" value={formatInches(snow)} />
        <Stat label="Rain" value={rain >= 0.01 ? `${rain.toFixed(2)}"` : "0\""} />
        <Stat
          label="Peak gust"
          value={peakGust == null ? "—" : `${Math.round(peakGust)} mph`}
          sub={peakGust != null && peakGust >= WIND_HOLD_MPH ? <span className="font-semibold text-barn">Wind holds possible</span> : undefined}
        />
        <Stat
          label="Lowest freezing level"
          hint="The height where the air crosses 32°F. Below the base means snow top to bottom."
          value={freezing ? formatFeet(freezing.freezingLevelFt) : "—"}
          sub={freezing ? formatDay(freezing.time.slice(0, 10), -1) : undefined}
        />
      </dl>

      <div className="mt-5">
        <HourlyChart blocks={blocks} />
      </div>
      <div className="mt-3">
        <HourlyLegend />
      </div>
    </Card>
  );
}

function Outlook({ forecast, detail }: { forecast: ResortForecast; detail: DetailState }) {
  const byDate = new Map(detail.data?.models.map((m) => [m.date, m]));
  const days: ChartDay[] = forecast.outlook.map((d) => ({
    ...d,
    rangeLowIn: byDate.get(d.date)?.lowIn ?? null,
    rangeHighIn: byDate.get(d.date)?.highIn ?? null,
  }));
  const anySnow = days.some((d) => (d.snowIn ?? 0) >= 0.1 || (d.rangeHighIn ?? 0) >= 0.1);
  const total = (model: (typeof MODELS)[number]["id"], from: number, to: number) =>
    sum((detail.data?.models ?? []).slice(from, to).map((m) => m.byModel[model]));

  return (
    <Card title="16-Day Outlook">
      {!anySnow && days.length > 0 && (
        <p className="mb-2 text-sm text-ink-muted">
          No snow from any of the three models through {formatShortDate(days[days.length - 1].date)}.
        </p>
      )}
      <SnowfallChart days={days} longRangeFrom={7} />
      <p className="mt-3 text-xs text-ink-muted">
        Bars: main forecast. Whiskers: range across the GFS, ECMWF and GEM models. Wider means less certain.
      </p>

      {detail.data && (
        <table className="mt-4 w-full text-sm tabular-nums">
          <caption className="mb-2 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
            What each model says
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="py-1.5 font-medium">Model</th>
              <th className="py-1.5 text-right font-medium">Next 7 days</th>
              <th className="py-1.5 text-right font-medium">Days 8–16</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-b-0">
                <td className="py-2">
                  <span className="font-semibold">{m.label}</span> <span className="text-ink-muted">{m.origin}</span>
                </td>
                <td className="py-2 text-right">{formatInches(total(m.id, 0, 7))}</td>
                <td className="py-2 text-right">{formatInches(total(m.id, 7, 16))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {detail.status === "error" && (
        <p className="mt-3 text-xs text-ink-muted">Model comparison is unavailable right now.</p>
      )}
    </Card>
  );
}

type ForecastTabProps = {
  resort: Resort;
  forecast: ResortForecast | undefined;
  forecastState: DetailState["status"];
  detail: DetailState;
};

function ForecastTab({ resort, forecast, forecastState, detail }: ForecastTabProps) {
  return (
    <div className="grid gap-4">
      <Card
        title="Snow Forecast"
        aside={
          forecast && (
            <span className="text-sm text-ink-muted tabular-nums">
              Now <span className="font-semibold text-ink"><CountUp value={forecast.tempF} format={formatTemp} /></span>
            </span>
          )
        }
      >
        {forecast ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Today" value={formatInches(forecast.todayIn)} />
            <Stat label="Next 3 days" value={formatInches(forecast.next3In)} />
            <Stat label="Next 7 days" value={formatInches(forecast.next7In)} />
            <Stat label="Days 8–16" hint="Long range: a trend, not a promise" value={formatInches(forecast.days8to16In)} />
          </dl>
        ) : (
          <Pending state={forecastState} />
        )}
      </Card>

      {detail.data ? <NextHours detail={detail.data} resort={resort} /> : (
        <Card title="Next 72 Hours">
          <Pending state={detail.status} what="hourly forecast" />
        </Card>
      )}

      {forecast ? <Outlook forecast={forecast} detail={detail} /> : (
        <Card title="16-Day Outlook">
          <Pending state={forecastState} />
        </Card>
      )}
    </div>
  );
}

function OfficialLinks({ resort }: { resort: Resort }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {LINKS.map(({ field, label, blurb }) => {
        const href = resort[field];
        if (!href) return null;
        const indirect = isEstimate(resort, field);
        return (
          <li key={field}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-md border border-line p-4 hover:border-glacier hover:bg-glacier/[.04]"
            >
              <span className="flex items-center justify-between gap-2 font-semibold">
                {label}
                <ExternalIcon className="h-4 w-4 text-ink-muted group-hover:text-glacier" />
              </span>
              <span className="mt-1 text-xs text-ink-muted">
                {blurb}
                {indirect && " Shown on the resort's conditions page."}
              </span>
              <span className="sr-only">(opens {resort.name}&apos;s website in a new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ReportTab({ resort, forecast, forecastState }: { resort: Resort; forecast: ResortForecast | undefined; forecastState: DetailState["status"] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Official Report" className="lg:col-span-2">
        <p className="mb-4 max-w-2xl text-sm text-ink-muted">Lift, trail and base depth figures come from {resort.name}.</p>
        <OfficialLinks resort={resort} />
      </Card>

      <Card title="Modeled Conditions">
        {forecast ? (
          <dl className="grid grid-cols-3 gap-4">
            <Stat label="Now" value={<CountUp value={forecast.tempF} format={formatTemp} />} />
            <Stat
              label="Snow depth"
              hint="Modeled snow on the ground from Open-Meteo, not the resort's reported base depth."
              value={<CountUp value={forecast.snowDepthIn} format={formatInches} />}
            />
            <Stat label="Last 7 days" value={formatInches(forecast.past7In)} />
          </dl>
        ) : (
          <Pending state={forecastState} />
        )}
      </Card>

      <Card title="Last 7 Days">
        {forecast ? <DailySnow days={forecast.past} past /> : <Pending state={forecastState} />}
      </Card>
    </div>
  );
}

function MountainTab({ resort }: { resort: Resort }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
      <Card title="Passes & Location">
        <dl className="grid gap-4">
          <div>
            <dt className="text-xs text-ink-muted">Accepted passes</dt>
            <dd className="mt-1">
              <PassTags passes={resort.passes} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Location</dt>
            <dd className="mt-0.5 text-sm">
              {US_STATES[resort.state] ?? resort.state} ·{" "}
              <a
                href={`https://www.openstreetmap.org/?mlat=${resort.lat}&mlon=${resort.lon}#map=12/${resort.lat}/${resort.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-glacier underline-offset-2 hover:underline"
              >
                View on map
              </a>
            </dd>
          </div>
        </dl>
        {resort.trailMapUrl && (
          <a
            href={resort.trailMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-snow hover:bg-navy-2"
          >
            Open trail map
            <ExternalIcon className="h-4 w-4" />
          </a>
        )}
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ResortDetail({ resort }: { resort: Resort }) {
  const { forecasts, forecastState, distanceTo } = useAppState();
  const [tab, setTab] = useHashTab();
  // Fetched here, not in the tab, so switching tabs doesn't download it again.
  const detail = useResortDetail(resort.id);
  const forecast = forecasts?.[resort.id];
  const distance = distanceTo(resort);

  const facts = [
    resort.summitFt && `${formatFeet(resort.summitFt)} summit`,
    resort.verticalFt && `${formatFeet(resort.verticalFt)} vertical`,
    resort.trails && `${resort.trails} trails`,
  ].filter(Boolean);

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
        <p className="mt-2 text-sm text-snow/70 tabular-nums sm:text-base">{facts.join(" · ")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PassTags passes={resort.passes} />
          {distance !== null && <span className="text-sm text-snow/70 tabular-nums">{Math.round(distance)} mi away</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <FavoriteButton id={resort.id} name={resort.name} tone="dark" withLabel />
          {resort.snowReportUrl && (
            <a
              href={resort.snowReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-snow/30 px-4 py-2.5 text-sm font-medium text-snow hover:border-snow/60 hover:bg-white/5"
            >
              Official report
              <ExternalIcon className="h-3.5 w-3.5 text-snow/60" />
              <span className="sr-only">(opens {resort.name}&apos;s website in a new tab)</span>
            </a>
          )}
        </div>
      </SiteHeader>

      <div className="sticky top-0 z-[1100] border-b border-line bg-snow/95 backdrop-blur">
        <div role="tablist" aria-label={`${resort.name} sections`} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 bottom-0 h-0.5 bg-alpenglow transition-opacity ${tab === t.id ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <main
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-12"
      >
        {tab === "forecast" && <ForecastTab resort={resort} forecast={forecast} forecastState={forecastState} detail={detail} />}
        {tab === "report" && <ReportTab resort={resort} forecast={forecast} forecastState={forecastState} />}
        {tab === "mountain" && <MountainTab resort={resort} />}
        <p className="mt-6 text-xs text-ink-muted">
          Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>{" "}
          (GFS, ECMWF and GEM models), refreshed every 30 minutes. Model output, not resort-reported conditions.
        </p>
      </main>
    </>
  );
}
