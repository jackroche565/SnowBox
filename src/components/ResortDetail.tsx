"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import AlertLine from "@/components/AlertLine";
import CountUp from "@/components/CountUp";
import HourlyChart, { HourlyLegend } from "@/components/HourlyChart";
import LiveCam, { camsFor, useWorkingCams } from "@/components/LiveCam";
import { StarIcon, WindIcon } from "@/components/Icons";
import { passText } from "@/components/PassTags";
import SegmentedControl from "@/components/SegmentedControl";
import SiteHeader from "@/components/SiteHeader";
import { formatObservedEnd, useObserved } from "@/components/useObserved";
import { STAKE_INCHES } from "@/components/SnowStake";
import { NEAR_DAYS, sum, type DailyForecast, type ResortForecast } from "@/lib/forecast";
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
  type SnowQuality,
} from "@/lib/resortForecast";
import { formatAlertTime, officeName, type ResortNws } from "@/lib/nws";
import { isEstimate, type Resort } from "@/lib/resorts";
import { formatOpening, isOpenOn } from "@/lib/season";
import { TERRAIN_CREDIT } from "@/lib/terrain";
import { PLACE_NAMES } from "@/lib/usStates";

// WebGL only runs in the browser, so the 3D header loads client-side.
const TerrainHero = dynamic(() => import("@/components/TerrainHero"), { ssr: false });

// One page, most-checked first: the mountain, recent and coming snow, the week, then detail and
// links. Sections sit on the snow ground, divided by ink rules.

/** Total model spread over days 8–16 above this reads as "models disagree". */
const DISAGREE_INCHES = 2;

function Section({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label} className="rule-section px-4 pt-3 pb-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold">{label}</h2>
        {aside && <span className="text-[13px] text-ink-muted tabular-nums">{aside}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Pending({ state, what = "forecast" }: { state: "loading" | "error" | "ready"; what?: string }) {
  return (
    <p className="text-[14px] text-ink-muted">
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

const QUALITY: Record<SnowQuality, string> = {
  dry: "light and dry",
  medium: "medium weight",
  wet: "heavy and wet",
};

/** "Friday" for a YYYY-MM-DD date. */
function weekday(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

/** "Thu 4pm", or "today 4pm". */
function formatWhen(time: string, today: string): string {
  const date = time.slice(0, 10);
  return `${date === today ? "today" : formatDay(date, 1)} ${formatHour(time)}`;
}

/** "Last snow 4 days ago", from the past week's daily totals. */
function lastSnow(forecast: ResortForecast): string {
  const i = forecast.past.findLastIndex((d) => (d.snowIn ?? 0) >= 1);
  if (i === -1) return `No snow in ${forecast.past.length} days`;
  return `Last snow ${forecast.past.length - i} days ago`;
}

// ── The mountain ──────────────────────────────────────────────────────

function SpecStrip({ resort }: { resort: Resort }) {
  const specs = [
    { field: "summitFt", label: "Summit", value: resort.summitFt, unit: "ft" },
    { field: "verticalFt", label: "Vertical", value: resort.verticalFt, unit: "ft" },
    { field: "trails", label: "Trails", value: resort.trails, unit: "" },
    { field: "baseFt", label: "Base", value: resort.baseFt, unit: "ft" },
  ] as const;
  return (
    <dl className="rule-section grid grid-cols-4 border-b border-ink">
      {specs.map((s, i) => (
        <div key={s.field} className={`py-2.5 pr-2 ${i > 0 ? "border-l border-rule pl-2.5" : "pl-4"}`}>
          <dt className="text-[11px] text-ink-muted">{s.label}</dt>
          <dd className="type-figure mt-1 text-[19px]">
            {s.value?.toLocaleString("en-US") ?? "—"}
            {s.unit && s.value != null && <span className="ml-0.5 font-sans text-[11px] font-normal text-ink-faint">{s.unit}</span>}
          </dd>
          {isEstimate(resort, s.field) && <dd className="text-[11px] text-ink-faint">est.</dd>}
        </div>
      ))}
    </dl>
  );
}

// ── Snow ──────────────────────────────────────────────────────────────

/** A horizontal snow stake: fills against 24", with ticks at 6, 12, 18 and 24. */
function Stake({ inches, color }: { inches: number; color: string }) {
  const fill = Math.min(1, Math.max(0, inches / STAKE_INCHES));
  return (
    <span aria-hidden="true" className="relative block h-2 w-full bg-snow-none/60">
      {fill > 0 && <span className="absolute inset-y-0 left-0" style={{ width: `max(${fill * 100}%, 2px)`, backgroundColor: color }} />}
      {[6, 12, 18, 24].map((t) => (
        <span key={t} className="absolute -top-1 -bottom-1 w-px bg-ink/30" style={{ left: `calc(${(t / STAKE_INCHES) * 100}% - 1px)` }} />
      ))}
    </span>
  );
}

function SnowRow({ label, inches, color, note }: { label: ReactNode; inches: number | null; color: string; note?: string }) {
  const value = inches ?? 0;
  return (
    <li className="rule-row grid grid-cols-[96px_64px_minmax(0,1fr)] items-center gap-3 py-3 first:border-t-0 first:pt-0">
      <span className="text-[14px]">
        {label}
        {note && <span className="block text-[11px] text-ink-faint">{note}</span>}
      </span>
      <span className="type-figure text-right text-[30px]" style={{ color: value < 0.1 ? "var(--ink-zero)" : color }}>
        <CountUp value={inches} format={formatInches} />
      </span>
      <Stake inches={value} color={color} />
    </li>
  );
}

function Snow({ resort, forecast }: { resort: Resort; forecast: ResortForecast }) {
  // NOAA's observed analysis when we have it; the model's own last two days otherwise.
  const observed = useObserved();
  const measured = observed?.last48[resort.id];
  // The past week comes with the slower part of the forecast; without it, the model has no last 48 hrs.
  const fresh = measured ?? (forecast.past.length ? last48In(forecast) : null);
  const note =
    measured != null
      ? `Observed by NOAA, to ${formatObservedEnd(observed!.endsAt, resort.timezone)}`
      : fresh == null
        ? undefined
        : fresh < 1
          ? lastSnow(forecast)
          : "Modeled";
  return (
    <Section
      label="Snow"
      aside={
        <>
          Now{" "}
          <span className="font-semibold text-ink">
            <CountUp value={forecast.tempF} format={formatTemp} />
          </span>
        </>
      }
    >
      <ul>
        <SnowRow label="Last 48 hrs" inches={fresh} color="var(--glacier)" note={note} />
        <SnowRow label="Next 3 days" inches={forecast.next3In} color="var(--glacier)" />
        <SnowRow
          label={
            <span title="Modeled snow on the ground from Open-Meteo, not the resort's reported base depth.">
              Base <span className="text-[11px] text-ink-faint">est.</span>
            </span>
          }
          inches={forecast.snowDepthIn}
          color="var(--ink)"
        />
      </ul>
    </Section>
  );
}

function LiveCams({ resort }: { resort: Resort }) {
  const cams = camsFor(resort, useWorkingCams());
  if (cams.length === 0) return null;
  return (
    <Section label="Live cams">
      <ul className="grid gap-4 sm:grid-cols-2">
        {cams.map((c) => (
          <li key={c.youtube}>
            <LiveCam cam={c} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── Next 7 days ───────────────────────────────────────────────────────

const CHART_PX = 84;
/** Bars scale to at least this many inches, so a dusting doesn't fill the chart. */
const CHART_MIN_SCALE = 12;

function WeekChart({ resort, days, stormDays, stormIn }: { resort: Resort; days: DailyForecast[]; stormDays: string[]; stormIn: number }) {
  const scale = Math.max(CHART_MIN_SCALE, ...days.map((d) => d.snowIn ?? 0));
  const first = days.findIndex((d) => stormDays.includes(d.date));
  const last = days.findLastIndex((d) => stormDays.includes(d.date));
  return (
    <div>
      {/* The storm's days, bracketed. */}
      <div className="relative h-7 text-[11px] font-semibold">
        {first !== -1 && (
          <span
            className="absolute bottom-0 flex h-[14px] justify-center border-x border-t border-ink"
            style={{
              left: `calc(${(first / days.length) * 100}% + 4px)`,
              width: `calc(${((last - first + 1) / days.length) * 100}% - 8px)`,
            }}
          >
            <span className="-mt-[9px] h-fit bg-snow px-1 leading-none whitespace-nowrap">Storm, about {formatInches(stormIn)}</span>
          </span>
        )}
      </div>
      <ol className="grid grid-cols-7">
        {days.map((d, i) => {
          const inches = d.snowIn ?? 0;
          const color = inches >= POWDER_INCHES ? "var(--alpenglow)" : "var(--glacier)";
          const windy = isOpenOn(resort, d.date) && d.gustMph != null && d.gustMph >= WIND_HOLD_MPH;
          return (
            <li key={d.date} className="flex flex-col items-center text-center">
              <div className="flex w-full flex-col items-center justify-end" style={{ height: CHART_PX + 24 }}>
                <span className="type-figure mb-1 text-[17px]" style={{ color: inches < 0.1 ? "var(--ink-zero)" : color }}>
                  {formatInches(d.snowIn)}
                </span>
                {inches >= 0.1 ? (
                  <span className="w-[60%]" style={{ height: Math.max(3, (inches / scale) * CHART_PX), backgroundColor: color }} />
                ) : (
                  <span className="h-[2px] w-[60%] bg-snow-none" />
                )}
              </div>
              <span className="w-full border-t border-ink pt-1.5 text-[13px] font-semibold">{formatDay(d.date, i)}</span>
              <span className="text-[11px] text-ink-muted tabular-nums">
                {formatTemp(d.highF)} <span className="text-ink-faint">{formatTemp(d.lowF)}</span>
              </span>
              <span className="mt-1 h-4">
                {windy && (
                  <>
                    <WindIcon className="h-4 w-4 text-ink" />
                    <span className="sr-only">Wind hold possible</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type Note = { key: string; wind?: boolean; lead: string; rest?: string };

/** Plain sentences under the chart: the opening date, the storm or a refreeze, and wind holds. */
function Notes({ resort, forecast, detail, today }: { resort: Resort; forecast: ResortForecast; detail: ResortDetailForecast | null; today: string }) {
  const notes: Note[] = [];
  const dayName = (date: string) => (date === today ? "today" : weekday(date));

  if (!isOpenOn(resort, today)) {
    notes.push(
      resort.opensOn
        ? { key: "opens", lead: `Opens ${formatOpening(resort.opensOn)}.`, rest: "Projected, depending on snow and cold for snowmaking." }
        : { key: "opens", lead: "Opening date not announced." },
    );
  }

  if (detail) {
    const storm = nextStorm(detail.summit.hours);
    const crust = refreeze(detail.base.hours) ?? refreeze(detail.summit.hours);
    const line = snowLine(detail.summit, detail.base);
    if (crust && (!storm || crust.wetAt < storm.start)) {
      notes.push({ key: "crust", lead: "Firm, icy snow likely.", rest: `Rain ${dayName(crust.wetAt.slice(0, 10))}, then ${formatTemp(crust.lowF)}.` });
    } else if (storm) {
      const quality = snowQuality(storm.tempF);
      const beforeLifts = Number(storm.end.slice(11, 13)) < FIRST_CHAIR_HOUR;
      const lead =
        storm.snowIn >= POWDER_INCHES
          ? `Powder ${dayName(storm.end.slice(0, 10))}.`
          : `${formatInches(storm.snowIn)} ${dayName(storm.start.slice(0, 10))}.`;
      const rest = [
        `Snow ${formatWhen(storm.start, today)} to ${
          storm.end.slice(0, 10) === storm.start.slice(0, 10) ? formatHour(storm.end) : formatWhen(storm.end, today)
        }`,
        quality && QUALITY[quality],
        line === "rain-below" && "rain at the base",
        beforeLifts && "done before the lifts open",
      ]
        .filter(Boolean)
        .join(", ");
      notes.push({ key: "storm", lead, rest: `${rest}.` });
    } else if (line === "rain-below" || line === "all-rain") {
      notes.push({
        key: "line",
        lead: line === "rain-below" ? "Rain at the base, snow up top" : "Rain or mix to the summit",
        rest: "in the next 72 hours.",
      });
    }
  }

  const windyDay = forecast.upcoming.find((d) => isOpenOn(resort, d.date) && d.gustMph != null && d.gustMph >= WIND_HOLD_MPH);
  if (windyDay) {
    notes.push({
      key: "wind",
      wind: true,
      lead: `Wind hold possible ${dayName(windyDay.date)}.`,
      rest: `Gusts to ${Math.round(windyDay.gustMph!)} mph.`,
    });
  }

  if (notes.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-col gap-2 text-[15px]">
      {notes.map((n) => (
        <li key={n.key} className="flex items-start gap-1.5">
          {n.wind && <WindIcon className="mt-[3px] h-4 w-4 shrink-0 text-ink" />}
          <span>
            <span className="font-semibold">{n.lead}</span>
            {n.rest && ` ${n.rest}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NextSevenDays({ resort, forecast, detail, today }: { resort: Resort; forecast: ResortForecast; detail: DetailState; today: string }) {
  // Week two: one figure, with whether the three models agree. GEM stops after about 10 days and
  // ECMWF after 15, so compare them only on the days every model covers.
  const late = (detail.data?.models.slice(7) ?? []).filter((d) => MODELS.every((m) => d.byModel[m.id] != null));
  const totals = MODELS.map((m) => sum(late.map((d) => d.byModel[m.id])));
  const spread = Math.max(...totals) - Math.min(...totals);

  const storm = detail.data ? nextStorm(detail.data.summit.hours) : null;
  const stormDays = storm
    ? forecast.upcoming.map((d) => d.date).filter((d) => d >= storm.start.slice(0, 10) && d <= storm.end.slice(0, 10))
    : [];

  return (
    <Section
      label="Next 7 days"
      aside={
        <>
          Days 8–16{" "}
          <span className="font-semibold text-ink">{forecast.outlook.length > NEAR_DAYS ? formatInches(forecast.days8to16In) : "—"}</span>
          {late.length > 0 && (spread >= DISAGREE_INCHES ? ", models disagree" : ", models agree")}
        </>
      }
    >
      <WeekChart resort={resort} days={forecast.upcoming} stormDays={stormDays} stormIn={storm?.snowIn ?? 0} />
      <Notes resort={resort} forecast={forecast} detail={detail.data} today={today} />
    </Section>
  );
}

// ── Hour by hour ──────────────────────────────────────────────────────

// ── Weather service ───────────────────────────────────────────────────

function useNws(id: string, covered: boolean): ResortNws | null {
  const [nws, setNws] = useState<ResortNws | null>(null);
  useEffect(() => {
    // The weather service covers the US only.
    if (!covered) return;
    let cancelled = false;
    fetch(`/api/nws/${id}`)
      .then((res) => (res.ok ? (res.json() as Promise<ResortNws>) : null))
      .then((data) => !cancelled && setNws(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, covered]);
  return nws;
}

function ForecasterNotes({ nws, resort }: { nws: ResortNws; resort: Resort }) {
  const d = nws.discussion;
  if (!d) return null;
  return (
    <details className="group rule-section">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[13px] font-semibold">
        Forecaster notes
        <span className="flex items-center gap-1.5 font-normal text-ink-muted">
          NWS {officeName(d.office)}, {formatAlertTime(d.issued, resort.timezone)}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9 L12 15 L18 9" />
          </svg>
        </span>
      </summary>
      <div className="px-4 pb-5 text-[15px] leading-relaxed">
        <p className="text-[13px] text-ink-muted">{d.title}</p>
        {d.paragraphs.map((p, i) => (
          <p key={i} className="mt-2">
            {p}
          </p>
        ))}
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[14px] text-glacier underline underline-offset-2">
          Full discussion<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </details>
  );
}

function HourByHour({ resort, detail }: { resort: Resort; detail: DetailState }) {
  const [elevation, setElevation] = useState<"summit" | "base">("summit");
  return (
    <details className="group rule-section">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[13px] font-semibold">
        Hour by hour
        <span className="flex items-center gap-1.5 font-normal text-ink-muted">
          Summit and base, 72 hrs
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9 L12 15 L18 9" />
          </svg>
        </span>
      </summary>
      <div className="px-4 pb-5">
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

// ── Links ─────────────────────────────────────────────────────────────

const LINKS = [
  { field: "webcamUrl", label: "Webcams" },
  { field: "trailMapUrl", label: "Trail map" },
  { field: "snowReportUrl", label: "Snow report" },
  { field: "websiteUrl", label: "Website" },
] as const;

function Links({ resort }: { resort: Resort }) {
  const report = resort.snowReportUrl ?? resort.websiteUrl;
  const links = LINKS.flatMap(({ field, label }) => {
    const href = resort[field];
    return href ? [{ href, label }] : [];
  });
  return (
    <section aria-label="Links" className="rule-section">
      {report && (
        <a
          href={report}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-baseline justify-between gap-3 px-4 py-3.5 hover:bg-white/50"
        >
          <span className="text-[15px] font-semibold">Lifts and trails open</span>
          <span className="text-right text-[14px] text-glacier underline underline-offset-2">
            {resort.name}&apos;s report<span className="sr-only"> (opens in a new tab)</span>
          </span>
        </a>
      )}
      {links.length > 0 && (
        <p className="rule-row px-4 py-3.5 text-[14px]">
          {links.map((l, i) => (
            <span key={l.label}>
              {i > 0 && <span className="text-ink-faint"> · </span>}
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-glacier underline underline-offset-2">
                {l.label}
              </a>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

function YourMountain({ resort }: { resort: Resort }) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const on = favoriteIds.includes(resort.id);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(resort.id)}
      aria-pressed={on}
      className={`flex items-center gap-1.5 text-[14px] ${on ? "font-semibold" : "text-ink-muted"}`}
    >
      <StarIcon filled={on} className={`h-[18px] w-[18px] ${on ? "text-ink" : ""}`} />
      Your mountain
    </button>
  );
}

export default function ResortDetail({ resort }: { resort: Resort }) {
  const { forecasts, regionState, requireRegion, distanceTo, origin } = useAppState();
  // This mountain's region may not be the one you've chosen; load its forecasts either way.
  useEffect(() => requireRegion(resort.region), [requireRegion, resort.region]);
  const forecastState = regionState(resort.region);
  const detail = useResortDetail(resort.id);
  const nws = useNws(resort.id, resort.nws !== undefined);
  const forecast = forecasts?.[resort.id];
  const distance = distanceTo(resort);
  const today = forecast?.upcoming[0]?.date;

  const meta = [
    PLACE_NAMES[resort.state] ?? resort.state,
    passText(resort.passes),
    distance !== null && origin ? `${Math.round(distance)} mi from ${origin.label.split(",")[0]}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5">
        <Link href="/explore" className="text-[14px] font-semibold">
          ← Explore
        </Link>
        <YourMountain resort={resort} />
      </div>

      {/* The mountain in 3D, fading into the page. */}
      <div className="relative h-[260px] overflow-hidden bg-[#e8eef4]">
        <TerrainHero lat={resort.lat} lon={resort.lon} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgb(243 245 248 / 0) 50%, var(--snow) 100%)" }}
        />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="relative -mt-12 px-4 pb-4">
          <p className="text-[13px] text-ink-muted tabular-nums">{meta.join(" · ")}</p>
          <h1 className="type-hero mt-1 text-[92px] [overflow-wrap:anywhere] max-[400px]:text-[76px]">{resort.name}</h1>
        </div>

        <SpecStrip resort={resort} />
        {nws && nws.alerts.length > 0 && (
          <ul aria-label="Weather service warnings" className="px-4 pt-3 pb-1 text-[15px]">
            {nws.alerts.map((a) => (
              <li key={a.event}>
                <AlertLine alert={a} timeZone={resort.timezone} office={resort.nws?.office} />
              </li>
            ))}
          </ul>
        )}

        {forecast && today ? (
          <>
            <Snow resort={resort} forecast={forecast} />
            <LiveCams resort={resort} />
            <NextSevenDays resort={resort} forecast={forecast} detail={detail} today={today} />
          </>
        ) : (
          <div className="rule-section px-4 py-4">
            <Pending state={forecastState} />
          </div>
        )}
        {nws && <ForecasterNotes nws={nws} resort={resort} />}
        <HourByHour resort={resort} detail={detail} />
        <Links resort={resort} />
        <p className="rule-row px-4 pt-3 pb-10 text-[10px] text-ink-faint">
          Modeled snow and base. Data:{" "}
          <a className="underline" href="https://open-meteo.com/">
            Open-Meteo
          </a>
          . {TERRAIN_CREDIT}
        </p>
      </main>
    </div>
  );
}
