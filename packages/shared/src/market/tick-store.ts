import { poSymbolToDisplay } from './pocket-symbols.js';

export interface MarketTick {
  price: number;
  ts: number;
  live?: boolean;
}

export interface TickQueryResult {
  asset: string;
  ticks: MarketTick[];
  latest: number | null;
  payout: number | null;
  live: boolean;
  /** PO catalog snapshot (updateAssets) — real but not streaming. */
  catalog: number | null;
  /** Last PO quote for UI — live or recent catalog. */
  display: number | null;
}

const CATALOG_TTL_MS = 30 * 60_000;
const MAX_TICKS_PER_SYMBOL = 400;

/** Resolve ?asset=eurusd_otc or ?asset=EUR/USD OTC */
export function resolveTickAssetQuery(raw: string): string | null {
  const q = raw.trim();
  if (!q) return null;
  if (q.includes('/') || /\sOTC$/i.test(q)) return q;
  const slug = q.replace(/-/g, '_').toLowerCase();
  return poSymbolToDisplay(slug);
}

/** In-memory tick history — same idea as creator's ticks?asset=&since= API. */
export class MarketTickStore {
  private ticks = new Map<string, MarketTick[]>();
  private lastPrice = new Map<string, number>();
  private payout = new Map<string, number>();
  private catalogPrice = new Map<string, number>();
  private catalogAt = new Map<string, number>();
  private liveAt = new Map<string, number>();

  clear(): void {
    this.ticks.clear();
    this.lastPrice.clear();
    this.payout.clear();
    this.catalogPrice.clear();
    this.catalogAt.clear();
    this.liveAt.clear();
  }

  setCatalogPrice(symbol: string, price: number, ts: number, payout?: number): void {
    if (!symbol || !Number.isFinite(price) || price <= 0) return;
    this.catalogPrice.set(symbol, price);
    this.catalogAt.set(symbol, ts);
    if (payout != null) this.payout.set(symbol, payout);
  }

  record(
    symbol: string,
    price: number,
    ts: number,
    meta?: { payout?: number; live?: boolean },
  ): void {
    if (!symbol || !Number.isFinite(price) || price <= 0) return;
    const prev = this.lastPrice.get(symbol);
    if (meta?.payout != null) this.payout.set(symbol, meta.payout);
    if (meta?.live) this.liveAt.set(symbol, ts);

    const changed = prev == null || Math.abs(prev - price) > 1e-12;
    if (!changed && meta?.payout == null) return;

    this.lastPrice.set(symbol, price);
    let list = this.ticks.get(symbol);
    if (!list) {
      list = [];
      this.ticks.set(symbol, list);
    }
    list.push({ price, ts, ...(meta?.live ? { live: true } : {}) });
    if (list.length > MAX_TICKS_PER_SYMBOL) list.splice(0, list.length - MAX_TICKS_PER_SYMBOL);
  }

  ingestBatch(
    assets: Array<{
      symbol: string;
      price?: number | null;
      lastKnownPrice?: number | null;
      payout?: number;
      live?: boolean;
      timestamp?: number;
    }>,
    activeSymbol?: string | null,
  ): void {
    const now = Date.now();
    for (const a of assets) {
      if (!a.symbol) continue;
      const price =
        typeof a.price === 'number'
          ? a.price
          : typeof a.lastKnownPrice === 'number'
            ? a.lastKnownPrice
            : null;
      if (price == null) {
        if (typeof a.payout === 'number') this.payout.set(a.symbol, a.payout);
        continue;
      }
      this.record(a.symbol, price, a.timestamp ?? now, {
        payout: a.payout,
        live: a.live === true || a.symbol === activeSymbol,
      });
    }
  }

  query(symbol: string, sinceMs: number): TickQueryResult {
    const list = this.ticks.get(symbol) ?? [];
    const cutoff = sinceMs > 0 ? sinceMs : 0;
    const ticks = cutoff > 0 ? list.filter((t) => t.ts > cutoff) : list.slice(-1);
    const latest = this.lastPrice.get(symbol) ?? null;
    const liveAt = this.liveAt.get(symbol) ?? 0;
    const cat = this.catalogPrice.get(symbol) ?? null;
    const catAt = this.catalogAt.get(symbol) ?? 0;
    const isLive = liveAt > 0 && Date.now() - liveAt < 10_000;
    const last = this.lastPrice.get(symbol) ?? null;
    const catalog =
      catAt > 0 && Date.now() - catAt < CATALOG_TTL_MS ? cat : null;
    return {
      asset: symbol,
      ticks,
      latest: isLive ? last : null,
      payout: this.payout.get(symbol) ?? null,
      live: isLive,
      catalog,
      display: isLive && last != null ? last : null,
    };
  }

  stats(): { symbols: number; totalTicks: number } {
    let totalTicks = 0;
    for (const list of this.ticks.values()) totalTicks += list.length;
    return { symbols: this.ticks.size, totalTicks };
  }
}
