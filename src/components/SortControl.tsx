import SegmentedControl from "@/components/SegmentedControl";

export type SortKey = "distance" | "next7" | "past7" | "name";

type Props = {
  value: SortKey;
  onChange: (key: SortKey) => void;
  distanceAvailable: boolean;
  className?: string;
};

export default function SortControl({ value, onChange, distanceAvailable, className }: Props) {
  return (
    <SegmentedControl
      label="Sort resorts by"
      value={value}
      onChange={onChange}
      className={className}
      segments={[
        { value: "next7", label: "Snow coming" },
        { value: "past7", label: "Recent snow" },
        {
          value: "distance",
          label: "Nearest",
          disabled: !distanceAvailable,
          title: distanceAvailable ? undefined : "Search a location to sort by distance",
        },
        { value: "name", label: "A–Z" },
      ]}
    />
  );
}
