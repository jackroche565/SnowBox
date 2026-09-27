export type SortKey = "distance" | "next7" | "past7" | "name";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "next7", label: "Snow coming" },
  { key: "past7", label: "Recent snow" },
  { key: "distance", label: "Nearest" },
  { key: "name", label: "A–Z" },
];

type Props = {
  value: SortKey;
  onChange: (key: SortKey) => void;
  distanceAvailable: boolean;
};

export default function SortControl({ value, onChange, distanceAvailable }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Sort resorts by"
      className="grid w-full grid-cols-4 rounded-md border border-line bg-white p-0.5 sm:inline-grid sm:w-auto"
    >
      {OPTIONS.map(({ key, label }) => {
        const checked = key === value;
        const disabled = key === "distance" && !distanceAvailable;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            title={disabled ? "Search a location to sort by distance" : undefined}
            onClick={() => onChange(key)}
            className={`whitespace-nowrap rounded px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              checked ? "bg-navy text-snow" : "text-ink-muted hover:text-ink disabled:opacity-40 disabled:hover:text-ink-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
