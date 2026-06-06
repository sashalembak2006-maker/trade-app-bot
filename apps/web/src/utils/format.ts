/** Display % change with max 2 decimals (no 0.0004564556436456). */
export function formatPercentChange(change: number): string {
  if (!Number.isFinite(change)) return '+0.00%';
  const rounded = Math.round(change * 100) / 100;
  const shown = Math.abs(rounded) < 0.01 ? 0 : rounded;
  return `${shown >= 0 ? '+' : ''}${shown.toFixed(2)}%`;
}
