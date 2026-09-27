import CountUp from "@/components/CountUp";
import DailySnow from "@/components/DailySnow";
import PassTags from "@/components/PassTags";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, formatTemp } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

export type EntryProps = {
  resort: Resort;
  forecast: ResortForecast | undefined;
  forecastState: "loading" | "error" | "ready";
  distance: number | null;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
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

export function FeaturedResort({
  label,
  resort,
  forecast,
  forecastState,
  distance,
  hovered,
  onSelect,
  onHover,
}: EntryProps & { label: string }) {
  const stats = forecast && [
    { label: "Next 7 days", value: formatInches(forecast.next7In) },
    { label: "Last 7 days", value: formatInches(forecast.past7In) },
    { label: "Snow depth", short: "Depth", value: <CountUp value={forecast.snowDepthIn} format={formatInches} />, hint: DEPTH_HINT },
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
      <div className="h-1 bg-alpenglow" />
      <div className="p-4 sm:p-5">
        <button type="button" onClick={onSelect} className="block w-full text-left">
          <div className="text-xs font-semibold tracking-wider text-alpenglow uppercase">{label}</div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h3 className="font-display text-4xl leading-none tracking-wide text-ink">
              {resort.name} <span className="text-2xl text-ink-muted">{resort.state}</span>
            </h3>
            <Distance miles={distance} />
          </div>
          <div className="mt-2">
            <PassTags passes={resort.passes} />
          </div>
        </button>

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
  selected,
  hovered,
  onSelect,
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
        hovered || selected ? "bg-glacier/[.07]" : "bg-white"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[3px] bg-glacier transition-opacity ${
          hovered || selected ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className="grid w-full grid-cols-4 items-center gap-x-2 gap-y-2 px-4 py-3 text-left sm:grid-cols-[minmax(0,1fr)_repeat(4,3.25rem)]"
      >
        <div className="col-span-4 flex min-w-0 items-center justify-between gap-2 sm:col-span-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{resort.name}</span>
            <span className="shrink-0 text-sm text-ink-muted">{resort.state}</span>
            <span className="shrink-0">
              <PassTags passes={resort.passes} />
            </span>
          </div>
          <Distance miles={distance} />
        </div>
        {cells ? (
          cells.map((c) => (
            <div key={c.label} className="tabular-nums sm:text-right">
              <div className="text-[11px] text-ink-muted sm:hidden">{c.label}</div>
              <div className={c.strong ? "font-semibold" : "text-ink"}>{c.value}</div>
            </div>
          ))
        ) : (
          <div className="col-span-4 sm:col-span-4 sm:text-right">
            <ForecastStatus state={forecastState} />
          </div>
        )}
      </button>
      {selected && forecast && (
        <div className="px-4 pb-4">
          <DailySnow days={forecast.upcoming} />
        </div>
      )}
    </div>
  );
}
