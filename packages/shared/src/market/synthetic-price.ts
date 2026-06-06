/** Plausible base quote per symbol when PO live stream is unavailable. */
export function syntheticBasePrice(symbol: string): number {
  const s = symbol.toUpperCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const r = (Math.abs(hash) % 10_000) / 10_000;

  if (/BTC/.test(s)) return 60_000 + r * 8_000;
  if (/ETH/.test(s)) return 2_800 + r * 400;
  if (/GOLD|XAU/.test(s)) return 2_300 + r * 120;
  if (/CLP|COP/.test(s)) return 820 + r * 120;
  if (/IDR|VND|KRW|HUF/.test(s)) return 12_000 + r * 4_000;
  if (/JPY/.test(s)) return 145 + r * 18;
  if (/INR|TRY|RUB|MXN|ZAR/.test(s)) return 18 + r * 80;
  return 0.45 + r * 1.8;
}

/** Drifting price for countdown / WS when bridge has payout only. */
export class SyntheticPriceEngine {
  private readonly prices = new Map<string, number>();

  seed(symbol: string): number {
    const p = syntheticBasePrice(symbol);
    this.prices.set(symbol, p);
    return p;
  }

  get(symbol: string): number {
    return this.prices.get(symbol) ?? this.seed(symbol);
  }

  tick(symbol: string): number {
    const cur = this.get(symbol);
    const delta = (Math.random() - 0.5) * cur * 0.0012;
    const next = Math.round((cur + delta) * 100_000) / 100_000;
    this.prices.set(symbol, next);
    return next;
  }
}
