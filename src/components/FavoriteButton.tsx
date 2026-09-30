"use client";

import { useAppState } from "@/components/AppState";
import { StarIcon } from "@/components/Icons";

type Props = {
  id: string;
  name: string;
  /** "light" sits on white cards; "dark" sits on the navy header. */
  tone?: "light" | "dark";
  /** Show "Save"/"Saved" beside the star, as an outlined button. */
  withLabel?: boolean;
  className?: string;
};

export default function FavoriteButton({ id, name, tone = "light", withLabel = false, className = "" }: Props) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const starred = favoriteIds.includes(id);
  const label = starred ? `Remove ${name} from My Mountains` : `Add ${name} to My Mountains`;
  const idle = tone === "dark" ? "text-snow/60 hover:text-snow" : "text-ink-muted/70 hover:text-ink";

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={starred}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-md transition-colors ${
        withLabel ? "gap-1.5 border border-snow/30 px-3 py-2.5 text-sm font-medium hover:border-snow/60" : "h-8 w-8"
      } ${starred ? "text-gold" : idle} ${className}`}
    >
      <StarIcon filled={starred} className={withLabel ? "h-4 w-4" : "h-5 w-5"} />
      {withLabel && <span className={starred ? "text-snow" : undefined}>{starred ? "Saved" : "Save"}</span>}
    </button>
  );
}
