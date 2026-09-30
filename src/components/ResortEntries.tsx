import Link from "next/link";
import CountUp from "@/components/CountUp";
import DailySnow from "@/components/DailySnow";
import FavoriteButton from "@/components/FavoriteButton";
import PassTags from "@/components/PassTags";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, formatTemp } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

export type CompareState = {
  inCompare: boolean;
  /** False when the tray is full and this resort isn't in it. */
  canAdd: boolean;
  onToggle: () => void;
};

export type EntryProps = {
  resort: Resort;
  forecast: ResortForecast | undefined;
  forecastState: "loading" | "error" | "ready";
  distance: number | null;
  hovered: boolean;
  compare: CompareState;
  /** The resort's detail page. */
  href: string;
  onHover: (hovering: boolean) => void;
};

const DEPTH_HINT = "Modeled snow on the ground from Open-Meteo, not the resort's reported base depth.";

function ForecastStatus({ state }: { state: EntryProps["forecastState"] }) {
  if (state === "ready") return null;
  return (
    <p className="text-sm text-ink-muted">{state === "loading" ? "Loading forecast…" : "Forecast unavailable"}</p>
  );
}

function Distance({ miles }: { miles: number | null }) {
  if (miles === null) return null;
  return <span className="shrink-0 text-sm text-ink-muted tabular-nums">{Math.round(miles)} mi</span>;
}

function CompareToggle({ name, compare }: { name: string; compare: CompareState }) {
  const { inCompare, canAdd, onToggle } = compare;
  const label = inCompare ? `Remove ${name} from compare` : `Add ${name} to compare`;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!inCompare && !canAdd}
      aria-pressed={inCompare}
      aria-label={label}
      title={!inCompare && !canAdd ? "Compare holds up to 3 resorts" : label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        inCompare
          ? "border-barn bg-barn text-white"
          : "border-line bg-white text-ink-muted hover:border-barn hover:text-barn"
      }`}
    >
      <span aria-hidden="true">{inCompare ? "✓" : "+"}</span>
    </button>
  );
}

export function FeaturedResort({
  label,
  resort,
  forecast,
  forecastState,
  distance,
  hovered,
  compare,
  href,
  onHover,
}: EntryProps & { label: string }) {
  const stats = forecast && [
    { label: "Next 7 days", value: formatInches(forecast.next7In) },
    { label: "Last 7 days", value: formatInches(forecast.past7In) },
    {
      label: "Snow depth",
      short: "Depth",
      value: <CountUp value={forecast.snowDepthIn} format={formatInches} />,
      hint: DEPTH_HINT,
    },
    { label: "Now", value: <CountUp value={forecast.tempF} format={formatTemp} /> },
  ];

  return (
    <article
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`overflow-hidden rounded-lg border bg-white transition-shadow ${
        hovered ? "border-glacier shadow-[0_0_0_1px_var(--glacier)]" : "border-line"
      }`}
    >
      <div className="h-1 bg-barn" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link href={href} className="group block min-w-0 flex-1 text-left">
            <span className="inline-block rounded-sm bg-barn px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
              {label}
            </span>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="font-display text-4xl leading-none tracking-wide text-ink">
                {resort.name} <span className="text-2xl text-ink-muted">{resort.state}</span>
              </h3>
              <Distance miles={distance} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <PassTags passes={resort.passes} />
              <span className="text-xs font-medium text-glacier group-hover:underline">View details →</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <FavoriteButton id={resort.id} name={resort.name} />
            <CompareToggle name={resort.name} compare={compare} />
          </div>
        </div>

        <div className="mt-4">
          <ForecastStatus state={forecastState} />
          {stats && (
            <>
              <dl className="grid grid-cols-4 gap-2">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs whitespace-nowrap text-ink-muted" title={s.hint}>
                      {s.short ? (
                        <>
                          <span className="sm:hidden">{s.short}</span>
                          <span className="hidden sm:inline">{s.label}</span>
                        </>
                      ) : (
                        s.label
                      )}
                      {s.hint && <span className="ml-0.5 cursor-help">ⓘ</span>}
                    </dt>
                    <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5">
                <DailySnow days={forecast.upcoming} />
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function ResortRow({
  resort,
  forecast,
  forecastState,
  distance,
  hovered,
  compare,
  href,
  onHover,
}: EntryProps) {
  const cells = forecast && [
    { label: "Next 7", value: formatInches(forecast.next7In), strong: true },
    { label: "Last 7", value: formatInches(forecast.past7In) },
    { label: "Depth", value: <CountUp value={forecast.snowDepthIn} format={formatInches} /> },
    { label: "Now", value: <CountUp value={forecast.tempF} format={formatTemp} /> },
  ];

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`relative border-b border-line transition-colors last:border-b-0 ${
        hovered ? "bg-glacier/[.07]" : "bg-white"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[3px] bg-glacier transition-opacity ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="flex items-start gap-2 py-3 pr-3 pl-3 sm:items-center">
        <div className="pt-0.5 sm:pt-0">
          <CompareToggle name={resort.name} compare={compare} />
        </div>
        <Link
          href={href}
          className="grid min-w-0 flex-1 grid-cols-4 items-center gap-x-2 gap-y-2 pr-1 text-left sm:grid-cols-[minmax(0,1fr)_repeat(4,3.25rem)]"
        >
          <div className="col-span-4 min-w-0 sm:col-span-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold" title={resort.name}>
                {resort.name}
              </span>
              <span className="shrink-0">
                <PassTags passes={resort.passes} />
              </span>
            </div>
            <div className="mt-0.5 text-xs text-ink-muted tabular-nums">
              {resort.state}
              {distance !== null && <> · {Math.round(distance)} mi</>}
            </div>
          </div>
          {cells ? (
            cells.map((c) => (
              <div key={c.label} className="tabular-nums sm:text-right">
                <div className="text-[11px] text-ink-muted sm:hidden">{c.label}</div>
                <div className={c.strong ? "font-semibold" : "text-ink"}>{c.value}</div>
              </div>
            ))
          ) : (
            <div className="col-span-4 sm:text-right">
              <ForecastStatus state={forecastState} />
            </div>
          )}
        </Link>
        <FavoriteButton id={resort.id} name={resort.name} className="-mt-1 sm:mt-0" />
      </div>
    </div>
  );
}
