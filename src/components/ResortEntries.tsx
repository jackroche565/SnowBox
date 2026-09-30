import Link from "next/link";
import CountUp from "@/components/CountUp";
import FavoriteButton from "@/components/FavoriteButton";
import PassTags from "@/components/PassTags";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, formatTemp } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

export type EntryProps = {
  resort: Resort;
  forecast: ResortForecast | undefined;
  forecastState: "loading" | "error" | "ready";
  distance: number | null;
  hovered: boolean;
  /** The resort's detail page. */
  href: string;
  onHover: (hovering: boolean) => void;
};

function ForecastStatus({ state }: { state: EntryProps["forecastState"] }) {
  if (state === "ready") return null;
  return (
    <p className="text-sm text-ink-muted">{state === "loading" ? "Loading forecast…" : "Forecast unavailable"}</p>
  );
}

/** One resort in Explore's list: name, passes and the key numbers, linking to its page. */
export function ResortRow({ resort, forecast, forecastState, distance, hovered, href, onHover }: EntryProps) {
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
      <div className="flex items-start gap-2 py-3 pr-3 pl-4 sm:items-center">
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
