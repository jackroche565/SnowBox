"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import CountUp from "@/components/CountUp";
import FavoriteButton from "@/components/FavoriteButton";
import HourlyChart, { HourlyLegend } from "@/components/HourlyChart";
import { ExternalIcon, SnowflakeIcon, WindIcon } from "@/components/Icons";
import PassTags from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import SnowStake from "@/components/SnowStake";
import { sum, type DailyForecast, type ResortForecast } from "@/lib/forecast";
import { formatDay, formatFeet, formatHour, formatInches, formatTemp } from "@/lib/format";
import { POWDER_INCHES, last48In } from "@/lib/outlook";
import {
  FIRST_CHAIR_HOUR,
  MODELS,
  WIND_HOLD_MPH,
  nextStorm,
  refreeze,
  snowLine,
  snowQuality,
  toBlocks,
  type ResortDetailForecast,
  type SnowLine,
  type SnowQuality,
} from "@/lib/resortForecast";
import { isEstimate, type Resort } from "@/lib/resorts";
import { formatOpening, isOpenOn, openingDate } from "@/lib/season";
import { TERRAIN_CREDIT } from "@/lib/terrain";
import { US_STATES } from "@/lib/usStates";

// WebGL only runs in the browser, so the 3D header loads client-side.
const TerrainHero = dynamic(() => import("@/components/TerrainHero"), { ssr: false });

// One page, most-checked first: recent snow, base, the next few days, wind, and where to find
// lifts and trails. Deeper detail (hour by hour) is folded away.

/** Total model spread over days 8–16 above this reads as "models disagree". */
const DISAGREE_INCHES = 2;

function Sheet({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label} className="sheet min-w-0 p-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{label}</h2>
        {aside}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function Figure({
  label,
  value,
  unit,
  stake,
  zero,
  sub,
  hint,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Inches for a snow stake beside the figure. */
  stake?: number;
  zero?: boolean;
  sub?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {/* Level with the figure, not the label, so a line underneath doesn't move it. */}
      {stake !== undefined && (
        <span className="mt-2.5">
          <SnowStake inches={stake} height={44} />
        </span>
      )}
      <div className="min-w-0">
        <dt className="text-xs text-ink-muted" title={hint}>
          {label}
        </dt>
        <dd className={`type-figure mt-1 text-[34px] ${zero ? "text-ink-zero" : "text-ink"}`}>
          {value}
          {unit && <span className="ml-1 font-sans text-[11px] font-medium text-ink-faint">{unit}</span>}
        </dd>
        {sub && <dd className="mt-1 text-xs">{sub}</dd>}
      </div>
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

const SNOW_LINE: Record<SnowLine, { text: string; tint: string; icon: string }> = {
  "all-snow": { text: "snow top to bottom", tint: "bg-ice", icon: "text-glacier" },
  "rain-below": { text: "rain at the base, snow at the summit", tint: "bg-[#efeaf7]", icon: "text-[#7a62a8]" },
  "all-rain": { text: "rain or mix up to the summit", tint: "bg-chip", icon: "text-ink-faint" },
  dry: { text: "dry", tint: "bg-chip", icon: "text-ink-faint" },
};

const QUALITY: Record<SnowQuality, string> = {
  dry: "light, dry snow",
  medium: "medium-weight snow",
  wet: "heavy, wet snow",
};

/** "Thu 4pm", or "Today 4pm". */
function formatWhen(time: string, today: string): string {
  const date = time.slice(0, 10);
  return `${date === today ? "Today" : formatDay(date, 1)} ${formatHour(time)}`;
}

/**
 * The next 72 hours in one line: a refreeze, the next storm (when, how much, how dense), or
 * otherwise where the rain/snow line sits.
 */
function NextUp({ detail, today }: { detail: ResortDetailForecast; today: string }) {
  const storm = nextStorm(detail.summit.hours);
  const crust = refreeze(detail.base.hours) ?? refreeze(detail.summit.hours);
  const line = snowLine(detail.summit, detail.base);

  if (crust && (!storm || crust.wetAt < storm.start)) {
    return (
      <Pill tint="bg-[#f7ebe6]" icon="text-barn">
        <span className="text-ink-muted">Rain {formatWhen(crust.wetAt, today)}, then {formatTemp(crust.lowF)}:</span>{" "}
        <span className="font-semibold">expect firm, icy snow</span>
      </Pill>
    );
  }
  if (storm) {
    const quality = snowQuality(storm.tempF);
    const endHour = Number(storm.end.slice(11, 13));
    const details = [
      quality && QUALITY[quality],
      endHour < FIRST_CHAIR_HOUR && "ends before the lifts open",
      line === "rain-below" && "rain at the base",
    ].filter(Boolean);
    return (
      <Pill tint="bg-ice" icon="text-glacier">
        <span className="font-semibold">
          {formatInches(storm.snowIn)} {formatWhen(storm.start, today)} – {formatWhen(storm.end, today)}
        </span>
        {details.length > 0 && (
          <span className="block text-ink-muted" title="Snow density is estimated from the temperature while it falls.">
            {details.join(" · ").replace(/^./, (c) => c.toUpperCase())}
          </span>
        )}
      </Pill>
    );
  }
  const { text, tint, icon } = SNOW_LINE[line];
  return (
    <Pill tint={tint} icon={icon}>
      <span className="text-ink-muted">Next 72 hours:</span> <span className="font-semibold">{text}</span>
    </Pill>
  );
}

function Pill({ tint, icon, children }: { tint: string; icon: string; children: ReactNode }) {
  return (
    <p className={`mt-4 flex items-start gap-2 rounded-[10px] px-3 py-[9px] text-[13px] ${tint}`}>
      <SnowflakeIcon className={`mt-[3px] h-3.5 w-3.5 shrink-0 ${icon}`} />
      <span>{children}</span>
    </p>
  );
}

/** "Last snow 4 days ago", from the past week's daily totals. */
function lastSnow(forecast: ResortForecast): string {
  const i = forecast.past.findLastIndex((d) => (d.snowIn ?? 0) >= 1);
  if (i === -1) return `No snow in ${forecast.past.length} days`;
  return `Last snow ${forecast.past.length - i} days ago`;
}

// ── Sections ──────────────────────────────────────────────────────────

function Conditions({ resort, forecast, detail }: { resort: Resort; forecast: ResortForecast; detail: DetailState }) {
  const gust = forecast.upcoming[0]?.gustMph ?? null;
  const report = resort.snowReportUrl ?? resort.websiteUrl;
  const fresh = last48In(forecast);
  const today = forecast.upcoming[0]?.date;
  // Before the season, when it opens matters more than wind on idle lifts.
  const preseason = today !== undefined && !isOpenOn(resort, today);

  return (
    <Sheet
      label="Conditions"
      aside={
        <span className="text-[13px] text-ink-muted tabular-nums">
          Now{" "}
          <span className="font-semibold text-ink">
            <CountUp value={forecast.tempF} format={formatTemp} />
          </span>
        </span>
      }
    >
      <dl className="grid grid-cols-2 items-start gap-x-4 gap-y-[18px]">
        <Figure
          label="Last 48 hrs"
          value={formatInches(fresh)}
          stake={fresh}
          zero={fresh < 0.1}
          sub={fresh < 1 ? <span className="text-ink-muted">{lastSnow(forecast)}</span> : undefined}
        />
        <Figure label="Next 3 days" value={formatInches(forecast.next3In)} stake={forecast.next3In} zero={forecast.next3In < 0.1} />
        <Figure
          label="Base"
          unit="est."
          hint="Modeled snow on the ground from Open-Meteo, not the resort's reported base depth."
          value={<CountUp value={forecast.snowDepthIn} format={formatInches} />}
          stake={forecast.snowDepthIn ?? 0}
          zero={(forecast.snowDepthIn ?? 0) < 0.1}
        />
        {preseason ? (
          <Figure
            label="Opens"
            value={resort.opensOn ? formatOpening(openingDate(resort, today)) : "—"}
            unit={resort.opensOn ? "projected" : undefined}
            hint={resort.opensOn ? "Projected by OnTheSnow. Openings depend on snow and cold for snowmaking." : undefined}
            sub={resort.opensOn ? undefined : <span className="text-ink-muted">Date not announced</span>}
          />
        ) : (
          <Figure
            label="Wind today"
            value={gust == null ? "—" : Math.round(gust)}
            unit="mph gusts"
            sub={gust != null && gust >= WIND_HOLD_MPH ? <span className="font-semibold text-barn">Lift holds possible</span> : undefined}
          />
        )}
      </dl>

      {detail.data && today && <NextUp detail={detail.data} today={today} />}

      {report && (
        <a
          href={report}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3 hover:border-glacier"
        >
          <span>
            <span className="block text-sm font-semibold">Lifts &amp; trails open</span>
            <span className="block text-xs text-ink-faint">Reported by {resort.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-glacier">
            Official report <ExternalIcon className="h-3.5 w-3.5" />
          </span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </Sheet>
  );
}

function DayRow({ day, index, open }: { day: DailyForecast; index: number; open: boolean }) {
  const snow = day.snowIn ?? 0;
  const rain = day.rainIn ?? 0;
  const windy = open && day.gustMph != null && day.gustMph >= WIND_HOLD_MPH;
  return (
    <li className="grid grid-cols-[52px_minmax(0,1fr)_76px_50px] items-center gap-2 border-t border-hairline py-2.5 text-sm tabular-nums">
      <span className="font-semibold">{formatDay(day.date, index)}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={`type-figure w-11 text-[17px] ${snow >= 0.1 ? "text-ink" : "text-ink-zero"}`}>{formatInches(day.snowIn)}</span>
        {snow >= POWDER_INCHES && <span className="text-xs font-semibold text-alpenglow">Powder</span>}
        {rain >= 0.05 && <span className="truncate text-xs text-ink-muted">Rain {rain.toFixed(2)}&Prime;</span>}
      </span>
      <span className="text-right">
        {formatTemp(day.highF)} <span className="text-ink-zero">{formatTemp(day.lowF)}</span>
      </span>
      <span className={`flex items-center justify-end gap-[3px] ${windy ? "font-semibold text-barn" : "text-ink-faint"}`}>
        <WindIcon className="h-[13px] w-[13px]" />
        {day.gustMph == null ? "—" : Math.round(day.gustMph)}
      </span>
    </li>
  );
}

function Forecast({ resort, forecast, detail }: { resort: Resort; forecast: ResortForecast; detail: DetailState }) {
  // Week two: one line, with whether the three models agree.
  const late = detail.data?.models.slice(7) ?? [];
  const totals = MODELS.map((m) => sum(late.map((d) => d.byModel[m.id])));
  const spread = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return (
    <Sheet label="Next 7 days">
      <ul className="-mt-1.5">
        {forecast.upcoming.map((d, i) => (
          <DayRow key={d.date} day={d} index={i} open={isOpenOn(resort, d.date)} />
        ))}
      </ul>
      <p className="border-t border-hairline pt-2.5 text-[13px] text-ink-muted">
        Days 8–16 <span className="type-figure text-[15px] text-ink">{formatInches(forecast.days8to16In)}</span>
        {detail.data && (spread >= DISAGREE_INCHES ? " · models disagree" : " · models agree")} · long range
      </p>
    </Sheet>
  );
}

function HourByHour({ resort, detail }: { resort: Resort; detail: DetailState }) {
  const [elevation, setElevation] = useState<"summit" | "base">("summit");
  return (
    <details className="group sheet">
      <summary className="flex cursor-pointer list-none items-center justify-between px-[18px] py-4 text-[15px] font-semibold">
        Hour by hour
        <span className="flex items-center gap-1.5 text-[13px] font-normal text-ink-faint">
          Summit &amp; base, 72 hrs
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9 L12 15 L18 9" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-hairline px-[18px] pt-3 pb-4">
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
              <HourlyChart blocks={toBlocks(detail.data[elevation].hours)} isOpen={(date) => isOpenOn(resort, date)} />
            </div>
            <div className="mt-3">
              <HourlyLegend windHolds={detail.data.summit.hours.some((h) => isOpenOn(resort, h.time.slice(0, 10)))} />
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
    { field: "summitFt", label: "Summit", value: resort.summitFt?.toLocaleString("en-US") ?? "—" },
    { field: "baseFt", label: "Base", value: resort.baseFt?.toLocaleString("en-US") ?? "—" },
    { field: "verticalFt", label: "Vertical", value: resort.verticalFt?.toLocaleString("en-US") ?? "—" },
    { field: "trails", label: "Trails", value: resort.trails ?? "—" },
  ] as const;

  return (
    <Sheet label="The mountain">
      <dl className="grid grid-cols-4 gap-2 tabular-nums">
        {facts.map((f) => (
          <div key={f.field}>
            <dt className="text-xs text-ink-faint">
              {f.label}
              {f.field !== "trails" && " (ft)"}
            </dt>
            <dd className="font-semibold">
              {f.value}
              {isEstimate(resort, f.field) && <span className="text-[10px] font-normal text-ink-zero"> est.</span>}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="mt-3.5 flex flex-wrap gap-2">
        {LINKS.map(({ field, label }) => {
          const href = resort[field];
          if (!href) return null;
          return (
            <li key={field}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-[10px] bg-chip px-3 py-2 text-[13px] font-medium hover:bg-line"
              >
                {label}
                <ExternalIcon className="h-3.5 w-3.5 text-ink-faint" />
                <span className="sr-only">(opens {resort.name}&apos;s website in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

function FloatingButton({ children, label, href }: { children: ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_1px_3px_rgb(15_26_42/0.12)] backdrop-blur-sm"
    >
      {children}
    </Link>
  );
}

export default function ResortDetail({ resort }: { resort: Resort }) {
  const { forecasts, forecastState, distanceTo, origin } = useAppState();
  const detail = useResortDetail(resort.id);
  const forecast = forecasts?.[resort.id];
  const distance = distanceTo(resort);
  const powder = forecast?.upcoming.findIndex((d) => (d.snowIn ?? 0) >= POWDER_INCHES) ?? -1;

  const facts = (
    [
      ["summitFt", resort.summitFt && `${formatFeet(resort.summitFt)} summit`],
      ["verticalFt", resort.verticalFt && `${formatFeet(resort.verticalFt)} vertical`],
      ["trails", resort.trails && `${resort.trails} trails`],
    ] as const
  ).flatMap(([field, text]) => (text ? [{ field, text }] : []));

  return (
    <div className="relative flex flex-1 flex-col">
      <SiteHeader />
      {/* Hero: the mountain in 3D, fading into the page. */}
      <div className="relative h-[400px] overflow-hidden bg-[#e8eef4]">
        <TerrainHero lat={resort.lat} lon={resort.lon} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgb(243 245 248 / 0) 45%, rgb(243 245 248 / 0.85) 80%, var(--snow) 100%)" }}
        />

        <div className="absolute inset-x-4 top-3 flex justify-between sm:hidden">
          <FloatingButton href="/explore" label="Back to Explore">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 L8 12 L15 19" />
            </svg>
          </FloatingButton>
          {forecast && powder !== -1 && (
            <span className="flex h-8 items-center gap-1.5 self-center rounded-full bg-alpenglow px-3 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgb(224_83_47/0.35)]">
              <SnowflakeIcon className="h-[13px] w-[13px]" />
              Powder {formatDay(forecast.upcoming[powder].date, powder)} · {formatInches(forecast.upcoming[powder].snowIn)}
            </span>
          )}
          <FavoriteButton id={resort.id} name={resort.name} variant="floating" />
        </div>

        <div className="absolute inset-x-5 bottom-[18px] mx-auto max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-ink-muted">
            <Link href="/explore" className="hidden hover:text-ink sm:inline">
              ← Explore
            </Link>
            <span>{US_STATES[resort.state] ?? resort.state}</span>
            <PassTags passes={resort.passes} />
            {distance !== null && origin && (
              <span className="tabular-nums">
                {Math.round(distance)} mi from {origin.label.split(",")[0]}
              </span>
            )}
            <span className="hidden sm:inline">
              <FavoriteButton id={resort.id} name={resort.name} withLabel />
            </span>
          </div>
          <h1 className="type-hero mt-0.5 text-[64px] sm:text-[80px]">{resort.name}</h1>
          <p className="mt-1.5 text-sm text-ink-muted tabular-nums">
            {facts.map(({ field, text }, i) => (
              <span key={field}>
                {i > 0 && " · "}
                {text}
                {isEstimate(resort, field) && <span className="ml-1 text-xs text-ink-zero">est.</span>}
              </span>
            ))}
          </p>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-3 pt-1 pb-10">
        {forecast ? (
          <>
            <Conditions resort={resort} forecast={forecast} detail={detail} />
            <Forecast resort={resort} forecast={forecast} detail={detail} />
          </>
        ) : (
          <div className="sheet p-[18px]">
            <Pending state={forecastState} />
          </div>
        )}
        <HourByHour resort={resort} detail={detail} />
        <MountainFacts resort={resort} />
        <p className="px-2 text-xs text-ink-faint">
          Forecasts from{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>{" "}
          (GFS, ECMWF and GEM models), refreshed every 30 minutes. Snow and base are modeled, not resort-reported.{" "}
          {TERRAIN_CREDIT}
        </p>
      </main>
    </div>
  );
}
