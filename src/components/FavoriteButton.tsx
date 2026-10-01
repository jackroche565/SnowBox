"use client";

import { useAppState } from "@/components/AppState";
import { StarIcon } from "@/components/Icons";

type Props = {
  id: string;
  name: string;
  /** "icon" sits in lists; "floating" is a white circle over imagery; "tile" is a square beside a button. */
  variant?: "icon" | "floating" | "tile";
  /** Show "Save"/"Saved" beside the star, as a pill. */
  withLabel?: boolean;
  className?: string;
};

export default function FavoriteButton({ id, name, variant = "icon", withLabel = false, className = "" }: Props) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const starred = favoriteIds.includes(id);
  const label = starred ? `Remove ${name} from your mountains` : `Add ${name} to your mountains`;

  const shape = withLabel
    ? "gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgb(15_26_42/0.08)] hover:bg-white"
    : variant === "floating"
      ? "h-10 w-10 rounded-full bg-white/90 shadow-[0_1px_3px_rgb(15_26_42/0.12)] backdrop-blur-sm"
      : variant === "tile"
        ? "h-11 w-11 rounded-xl bg-chip hover:bg-line"
        : "h-8 w-8 rounded-full hover:bg-chip";

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={starred}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center transition-colors ${shape} ${className}`}
    >
      <StarIcon filled={starred} className={`${withLabel ? "h-4 w-4" : "h-[18px] w-[18px]"} ${starred ? "text-gold" : "text-ink-faint"}`} />
      {withLabel && <span>{starred ? "Saved" : "Save"}</span>}
    </button>
  );
}
