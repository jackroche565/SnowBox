export type Segment<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
  /** Background when selected; defaults to navy. */
  color?: string;
};

type Props<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export default function SegmentedControl<T extends string>({ label, segments, value, onChange, className = "" }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid rounded-md border border-line bg-white p-0.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, auto))` }}
    >
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
            className={`rounded px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:text-sm ${
              checked ? "text-white" : "text-ink-muted hover:text-ink disabled:opacity-40 disabled:hover:text-ink-muted"
            }`}
            style={checked ? { backgroundColor: segment.color ?? "var(--navy)" } : undefined}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
