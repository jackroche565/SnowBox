export type SortKey = "distance" | "next7" | "past7" | "name";

const LABELS: Record<SortKey, string> = {
  next7: "Most snow first",
  past7: "Most recent snow",
  distance: "Nearest first",
  name: "A–Z",
};

type Props = {
  value: SortKey;
  onChange: (key: SortKey) => void;
  distanceAvailable: boolean;
};

/** A quiet dropdown for list order. */
export default function SortControl({ value, onChange, distanceAvailable }: Props) {
  return (
    <label className="relative flex items-center text-[13px] text-ink-muted">
      <span className="sr-only">Sort resorts</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer appearance-none bg-transparent py-1 pr-5 text-right font-medium text-ink-muted hover:text-ink focus:outline-none"
      >
        {(Object.keys(LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k} disabled={k === "distance" && !distanceAvailable}>
            {LABELS[k]}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-0 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9 L12 15 L18 9" />
      </svg>
    </label>
  );
}
