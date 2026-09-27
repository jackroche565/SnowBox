/** Round an axis maximum up to a friendly value and pick tick marks for it. */
export function niceScale(max: number, targetTicks = 3): { top: number; ticks: number[] } {
  const raw = Math.max(max, 1e-9) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { top, ticks };
}
