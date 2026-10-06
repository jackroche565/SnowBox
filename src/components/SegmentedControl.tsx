export type Segment<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
};

type Props<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Text tabs: the selected one is ink, bold and underlined. */
export default function SegmentedControl<T extends string>({ label, segments, value, onChange, className = "" }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-4 ${className}`}>
      {segments.map((segment) => {
        const checked = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={segment.disabled}
            title={segment.title}
            onClick={() => onChange(segment.value)}
            className={`border-b-2 pb-1 text-[14px] whitespace-nowrap ${
              checked ? "border-ink font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink disabled:opacity-40"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
