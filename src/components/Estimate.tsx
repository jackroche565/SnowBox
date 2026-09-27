/** Small marker for a figure that is an estimate or where published sources disagree. */
export default function Estimate({ note = "Estimate — published sources disagree or don't list this figure" }: { note?: string }) {
  return (
    <abbr
      title={note}
      className="ml-1 cursor-help align-super text-[10px] font-medium tracking-wide text-ink-muted no-underline"
    >
      est.
    </abbr>
  );
}
