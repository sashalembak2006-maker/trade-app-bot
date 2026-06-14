/** Max allowed gap between list price and live PO quote (scales with rate). */
export function maxAcceptableDrift(price: number): number {
  const abs = Math.abs(price);
  if (abs >= 100) return abs * 0.0003;
  if (abs >= 10) return 0.003;
  if (abs >= 1) return 0.0005;
  return Math.max(0.00008, abs * 0.001);
}

export function priceDrift(a: number, b: number): number {
  return Math.abs(a - b);
}

export function isDriftAcceptable(reference: number, candidate: number): boolean {
  return priceDrift(reference, candidate) <= maxAcceptableDrift(reference);
}
