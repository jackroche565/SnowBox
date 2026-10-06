import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import { passText } from "@/components/PassTags";
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

/** One resort in Explore's list: name, passes and the week's snow, on a ruled row. */
export function ResortRow({ resort, forecast, forecastState, distance, hovered, href, onHover }: EntryProps) {
  const snow = forecast?.next7In ?? 0;
  const meta = [
    resort.state,
    passText(resort.passes),
    distance !== null && `${Math.round(distance)} mi`,
    forecast && formatTemp(forecast.tempF),
    forecast && forecast.past7In >= 0.1 && `${formatInches(forecast.past7In)} last 7 days`,
  ].filter(Boolean);

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`rule-row flex items-center gap-2 pr-2 pl-4 ${hovered ? "bg-white/60" : ""}`}
    >
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 py-3">
        <span className="min-w-0 flex-1">
          <span className="type-name block truncate text-[19px]">{resort.name}</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-muted tabular-nums">{meta.join(" · ")}</span>
        </span>
        {forecast ? (
          <span className="text-right">
            <span className={`type-figure block text-[24px] ${snow >= 0.1 ? "text-glacier" : "text-ink-zero"}`}>{formatInches(snow)}</span>
            <span className="mt-0.5 block text-[11px] whitespace-nowrap text-ink-faint">next 7 days</span>
          </span>
        ) : (
          <span className="text-[13px] text-ink-faint">{forecastState === "error" ? "Unavailable" : "Loading…"}</span>
        )}
      </Link>
      <FavoriteButton id={resort.id} name={resort.name} />
    </div>
  );
}
