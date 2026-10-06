"use client";

import { useAppState } from "@/components/AppState";
import { StarIcon } from "@/components/Icons";

/** A star that adds or removes a mountain from yours. Filled ink when it's yours. */
export default function FavoriteButton({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const { favoriteIds, toggleFavorite } = useAppState();
  const starred = favoriteIds.includes(id);
  const label = starred ? `Remove ${name} from your mountains` : `Add ${name} to your mountains`;

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={starred}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center ${className}`}
    >
      <StarIcon filled={starred} className={`h-[18px] w-[18px] ${starred ? "text-ink" : "text-ink-faint"}`} />
    </button>
  );
}
