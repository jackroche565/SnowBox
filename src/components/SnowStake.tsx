/** Snow fills the stake against this many inches. */
export const STAKE_INCHES = 24;

/** A ruled snow stake that fills from the bottom. Decorative: the number beside it carries the value. */
export default function SnowStake({ inches, height = 34 }: { inches: number | null | undefined; height?: number }) {
  const fill = Math.min(1, Math.max(0, (inches ?? 0) / STAKE_INCHES));
  return (
    <span aria-hidden="true" className="stake block shrink-0" style={{ height }}>
      {fill > 0 && (
        <span
          className="absolute inset-x-0 bottom-0 bg-glacier"
          style={{ height: `max(${fill * 100}%, 2px)` }}
        />
      )}
    </span>
  );
}
