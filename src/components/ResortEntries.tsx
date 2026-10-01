import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import PassTags from "@/components/PassTags";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, formatTemp, resortColor } from "@/lib/format";
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

/** One resort in Explore's list: its map color, name, passes and the week's snow. */
export function ResortRow({ resort, forecast, forecastState, distance, hovered, href, onHover }: EntryProps) {
  const snow = forecast?.next7In ?? 0;
  const meta = [
    resort.state,
    distance !== null && `${Math.round(distance)} mi`,
    forecast && formatTemp(forecast.tempF),
    forecast && forecast.past7In >= 0.1 && `${formatInches(forecast.past7In)} last 7 days`,
  ].filter(Boolean);

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`flex items-center gap-3 border-t border-hairline pr-3 pl-[18px] transition-colors ${hovered ? "bg-snow" : ""}`}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_2px_#fff,0_0_0_3px_var(--line)]"
        style={{ backgroundColor: resortColor(resort.passes) }}
      />
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="type-name truncate text-lg">{resort.name}</span>
            <PassTags passes={resort.passes} />
          </span>
          <span className="block truncate text-xs text-ink-faint tabular-nums">{meta.join(" · ")}</span>
        </span>
        {forecast ? (
          <span className="text-right">
            <span className={`type-figure block text-[22px] ${snow >= 0.1 ? "text-ink" : "text-ink-zero"}`}>{formatInches(snow)}</span>
            <span className="mt-0.5 block text-[11px] whitespace-nowrap text-ink-faint">next 7 days</span>
          </span>
        ) : (
          <span className="text-xs text-ink-faint">{forecastState === "error" ? "Unavailable" : "Loading…"}</span>
        )}
      </Link>
      <FavoriteButton id={resort.id} name={resort.name} />
    </div>
  );
}
