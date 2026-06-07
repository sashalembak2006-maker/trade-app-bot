import type {
  Asset,
  AssetCategory,
  BridgeAssetInput,
  MarketAnalysisData,
  MarketDataRow,
  MarketDataStatus,
  PriceUpdate,
} from '../types/index.js';
import { generateMockCandles } from '../signal/engine.js';
import {
  calculateVolatility,
  detectTrend,
} from '../signal/indicators.js';
import {
  DataSourceNotConfiguredError,
  NoLivePriceError,
  type MarketDataProvider,
} from './provider.js';
import { isPlausibleMarketPrice } from './price-validation.js';
import { SyntheticPriceEngine } from './synthetic-price.js';
import { resolveAssetFlags } from './asset-flags.js';
import { normalizeAssetCategory, resolveAssetCategory } from './asset-category.js';

let syntheticFallbackEnabled = true;

/** API sets this from PLATFORM_SYNTHETIC_FALLBACK env (default on in dev). */
export function setBridgeSyntheticFallback(enabled: boolean): void {
  syntheticFallbackEnabled = enabled;
}

export function isBridgeSyntheticFallbackEnabled(): boolean {
  return syntheticFallbackEnabled;
}

interface StoredAsset {
  symbol: string;
  price: number | null;
  /** Last real tick — kept even when live stream stops. */
  lastKnownPrice: number | null;
  priceUpdatedAt: number;
  payout: number;
  change: number;
  category: AssetCategory;
  isOTC: boolean;
  updatedAt: number;
}

interface Listener {
  symbols: Set<string>;
  cb: (data: PriceUpdate) => void;
}

/** Bridge/collector should stay connected if POSTs pause briefly. */
const HEARTBEAT_STALE_MS = 45_000;
const PRICE_STALE_MS = 12_000;
/** Non-active pairs: micro-ticks for Mini App list (≈1/s). */
const SYNTHETIC_TICK_MS = 50;

function roundChangePct(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const rounded = Math.round(raw * 100) / 100;
  return Math.abs(rounded) < 0.01 ? 0 : rounded;
}

/**
 * Platform Bridge provider — payout for all assets, live price for focused/active pair only.
 */
export class BridgeMarketDataProvider implements MarketDataProvider {
  private assets = new Map<string, StoredAsset>();
  private listeners = new Set<Listener>();
  private lastUpdate = 0;
  private readonly synthetic = new SyntheticPriceEngine();
  private syntheticTimer: ReturnType<typeof setInterval> | null = null;
  private usingSynthetic = false;

  get status(): MarketDataStatus {
    const heartbeatFresh =
      this.lastUpdate > 0 && Date.now() - this.lastUpdate <= HEARTBEAT_STALE_MS;
    const stale = this.lastUpdate > 0 && !heartbeatFresh;
    const hybrid = syntheticFallbackEnabled && this.usingSynthetic;
    return {
      mode: 'live',
      configured: heartbeatFresh,
      stale,
      lastUpdate: this.lastUpdate || null,
      assetCount: this.assets.size,
      source: this.lastUpdate
        ? `platform-bridge${hybrid ? ' (hybrid)' : ''}${stale ? ' (STALE)' : ''}`
        : 'platform-bridge (waiting for data)',
    };
  }

  private displayPrice(a: StoredAsset): number | null {
    if (this.isLive(a) && a.price != null) return a.price;
    if (syntheticFallbackEnabled) {
      if (a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)) {
        if (!this.synthetic.has(a.symbol)) this.synthetic.anchor(a.symbol, a.lastKnownPrice);
        return this.synthetic.get(a.symbol);
      }
      return this.synthetic.get(a.symbol);
    }
    if (a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)) {
      return a.lastKnownPrice;
    }
    return null;
  }

  private applySynthetic(symbol: string): number {
    const price = this.synthetic.seed(symbol);
    const prev = this.assets.get(symbol);
    const now = Date.now();
    const stored: StoredAsset = {
      symbol,
      price,
      lastKnownPrice: price,
      priceUpdatedAt: now,
      payout: prev?.payout ?? 92,
      change: prev?.change ?? 0,
      category: prev?.category ?? resolveAssetCategory(symbol),
      isOTC: prev?.isOTC ?? /otc/i.test(symbol),
      updatedAt: now,
    };
    this.assets.set(symbol, stored);
    this.usingSynthetic = true;
    this.ensureSyntheticTimer();
    this.emit({ symbol, price, payout: stored.payout, change: stored.change, ts: now });
    return price;
  }

  private ensureSyntheticTimer(): void {
    if (this.syntheticTimer || !syntheticFallbackEnabled) return;
    this.syntheticTimer = setInterval(() => {
      if (this.assets.size === 0) return;
      const now = Date.now();
      for (const [symbol, a] of this.assets) {
        if (this.isLive(a)) continue;
        if (a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, symbol)) {
          if (!this.synthetic.has(symbol)) this.synthetic.anchor(symbol, a.lastKnownPrice);
        }
        const price = this.synthetic.tick(symbol);
        const prev = a.price ?? a.lastKnownPrice;
        let change = a.change;
        if (prev != null && prev > 0 && price !== prev) {
          change = roundChangePct(((price - prev) / prev) * 100);
        }
        a.price = price;
        a.priceUpdatedAt = now;
        a.change = change;
        this.assets.set(symbol, a);
        this.usingSynthetic = true;
        this.emit({ symbol, price, payout: a.payout, change, ts: now });
      }
    }, SYNTHETIC_TICK_MS);
  }

  /** Push current display prices to WS subscribers (after bridge ingest). */
  pulseSubscribers(): void {
    if (this.listeners.size === 0) return;
    const now = Date.now();
    for (const l of this.listeners) {
      for (const symbol of l.symbols) {
        const a = this.assets.get(symbol);
        if (!a) continue;
        const price = this.displayPrice(a);
        if (price == null) continue;
        try {
          l.cb({ symbol, price, payout: a.payout, change: a.change, ts: now });
        } catch {
          /* WS / subscriber errors must not break bridge POST */
        }
      }
    }
  }

  hasLivePrice(symbol: string): boolean {
    const a = this.assets.get(symbol);
    return !!a && this.isLive(a);
  }

  private isLive(a: StoredAsset): boolean {
    return (
      a.price != null &&
      a.priceUpdatedAt > 0 &&
      Date.now() - a.priceUpdatedAt <= PRICE_STALE_MS
    );
  }

  /**
   * Block until a fresh live tick arrives for `symbol` (used during signal generation).
   * Bridge/collector should focus this pair while waiting.
   */
  async waitForLivePrice(
    symbol: string,
    timeoutMs: number,
    options?: { allowSynthetic?: boolean },
  ): Promise<number> {
    this.requireConfigured();
    const allowSynthetic = options?.allowSynthetic ?? syntheticFallbackEnabled;
    const immediate = this.assets.get(symbol);
    if (immediate && this.isLive(immediate) && immediate.price != null) {
      return immediate.price;
    }

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const unsub = this.subscribe([symbol], (update) => {
        if (update.symbol !== symbol) return;
        const a = this.assets.get(symbol);
        if (a && this.isLive(a) && a.price != null) {
          clearInterval(interval);
          unsub();
          resolve(a.price);
        }
      });
      const interval = setInterval(() => {
        const a = this.assets.get(symbol);
        if (a && this.isLive(a) && a.price != null) {
          clearInterval(interval);
          unsub();
          resolve(a.price);
          return;
        }
        if (Date.now() >= deadline) {
          clearInterval(interval);
          unsub();
          if (allowSynthetic && syntheticFallbackEnabled && this.assets.has(symbol)) {
            resolve(this.applySynthetic(symbol));
            return;
          }
          reject(new NoLivePriceError(`No live price for ${symbol} within ${timeoutMs}ms`));
        }
      }, 200);
    });
  }

  /** Live bridge tick only — never synthetic (for signal settlement). */
  getLivePrice(symbol: string): number | null {
    const a = this.assets.get(symbol);
    if (a && this.isLive(a) && a.price != null) return a.price;
    return null;
  }

  ingest(input: BridgeAssetInput[], activeSymbol?: string | null): number {
    const now = Date.now();
    let count = 0;
    const normalizedActive = activeSymbol?.trim() || null;

    for (const a of input) {
      if (!a.symbol || typeof a.payout !== 'number') continue;
      const isOTC = a.isOTC ?? /otc/i.test(a.symbol);
      const prev = this.assets.get(a.symbol);
      const rawPrice = typeof a.price === 'number' ? a.price : null;
      const validPrice =
        rawPrice != null && isPlausibleMarketPrice(rawPrice, a.symbol) ? rawPrice : null;
      const prevLkp =
        prev?.lastKnownPrice != null && isPlausibleMarketPrice(prev.lastKnownPrice, a.symbol)
          ? prev.lastKnownPrice
          : null;
      let prevLive =
        prev?.price != null && isPlausibleMarketPrice(prev.price, a.symbol) ? prev.price : null;

      const isFocused = normalizedActive != null && a.symbol === normalizedActive;
      let priceUpdatedAt = prev?.priceUpdatedAt ?? 0;
      if (validPrice) {
        priceUpdatedAt = a.timestamp ?? now;
        this.synthetic.anchor(a.symbol, validPrice);
      } else if (isFocused && prevLive != null) {
        // Active pair heartbeat without a new tick — keep previous live price fresh.
        priceUpdatedAt = now;
      }

      const effectivePrice = validPrice ?? prevLive;
      const prevForChange = prev?.price ?? prev?.lastKnownPrice;
      let change = prev?.change ?? 0;
      if (validPrice != null && prevForChange != null && prevForChange > 0 && validPrice !== prevForChange) {
        change = roundChangePct(((validPrice - prevForChange) / prevForChange) * 100);
      }

      const stored: StoredAsset = {
        symbol: a.symbol,
        price: effectivePrice,
        lastKnownPrice: validPrice ?? prevLkp ?? (effectivePrice ?? null),
        priceUpdatedAt,
        payout: a.payout,
        change,
        category: normalizeAssetCategory(a.category, a.symbol, isOTC),
        isOTC,
        updatedAt: a.timestamp ?? now,
      };
      this.assets.set(a.symbol, stored);
      count++;

      const emitPrice =
        validPrice ??
        (effectivePrice != null && (this.isLive(stored) || isFocused) ? effectivePrice : null);
      if (emitPrice != null) {
        this.emit({
          symbol: stored.symbol,
          price: emitPrice,
          payout: stored.payout,
          change: stored.change,
          ts: now,
        });
      }
    }
    if (count > 0) {
      this.lastUpdate = now;
      if (syntheticFallbackEnabled) {
        this.ensureSyntheticTimer();
        this.pulseSubscribers();
      }
    }
    return count;
  }

  /** Drop corrupted prices (timestamps, payout bleed) without clearing payouts. */
  sanitize(): number {
    let fixed = 0;
    for (const [symbol, a] of this.assets) {
      let dirty = false;
      if (a.price != null && !isPlausibleMarketPrice(a.price, symbol)) {
        a.price = null;
        dirty = true;
      }
      if (a.lastKnownPrice != null && !isPlausibleMarketPrice(a.lastKnownPrice, symbol)) {
        a.lastKnownPrice = null;
        dirty = true;
      }
      if (dirty) {
        a.priceUpdatedAt = 0;
        this.assets.set(symbol, a);
        fixed++;
      }
    }
    return fixed;
  }

  clear(): void {
    this.assets.clear();
    this.lastUpdate = 0;
  }

  rows(): MarketDataRow[] {
    return Array.from(this.assets.values()).map((a) => ({
      symbol: a.symbol,
      price: this.isLive(a) ? a.price : a.lastKnownPrice,
      payout: a.payout,
      source: 'platform-bridge',
      lastUpdated: a.updatedAt,
      stale: !this.isLive(a),
    }));
  }

  private emit(update: PriceUpdate) {
    for (const l of this.listeners) {
      if (!l.symbols.has(update.symbol)) continue;
      try {
        l.cb(update);
      } catch {
        /* subscriber errors must not break ingest */
      }
    }
  }

  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values()).map((a) => ({
      id: a.symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      symbol: a.symbol,
      name: a.symbol.replace(/ otc$/i, ''),
      category: a.category,
      isOTC: a.isOTC,
      price: this.displayPrice(a),
      lastKnownPrice:
        a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)
          ? a.lastKnownPrice
          : syntheticFallbackEnabled
            ? this.synthetic.get(a.symbol)
            : null,
      payout: a.payout,
      change: a.change,
      flags: resolveAssetFlags(a.symbol),
      favorite: false,
    }));
  }

  private requireConfigured(): void {
    if (!this.status.configured) throw new DataSourceNotConfiguredError();
  }

  async getAssetPrice(symbol: string): Promise<number> {
    this.requireConfigured();
    const asset = this.assets.get(symbol);
    if (!asset) throw new DataSourceNotConfiguredError(`No bridge data for ${symbol}`);
    if (this.isLive(asset) && asset.price != null) return asset.price;
    if (syntheticFallbackEnabled) return this.applySynthetic(symbol);
    throw new NoLivePriceError(`No live price for ${symbol}`);
  }

  async getPayout(symbol: string): Promise<number> {
    this.requireConfigured();
    const asset = this.assets.get(symbol);
    if (!asset) throw new DataSourceNotConfiguredError(`No bridge data for ${symbol}`);
    return asset.payout;
  }

  async getMarketAnalysis(symbol: string): Promise<MarketAnalysisData> {
    const price = await this.getAssetPrice(symbol).catch(() =>
      syntheticFallbackEnabled ? this.synthetic.get(symbol) : 0,
    );
    const asset = this.assets.get(symbol)!;
    const candles = generateMockCandles(price, 60);
    const closes = candles.map((c) => c.close);
    const trend = detectTrend(closes);
    const volatility = calculateVolatility(candles);
    return {
      symbol,
      trend,
      volatilityScore: Math.min(100, Math.round(volatility * 10)),
      payoutScore: asset.payout,
      signalConfidence: Math.min(95, 58 + (Math.abs(Math.round(price * 10000)) % 35)),
      recommendedTimeframe: ['1m', '3m', '5m'][Math.round(price) % 3],
      riskLevel: asset.payout < 65 ? 'high' : asset.payout > 80 ? 'low' : 'medium',
    };
  }

  subscribe(symbols: string[], callback: (data: PriceUpdate) => void): () => void {
    const listener: Listener = { symbols: new Set(symbols), cb: callback };
    this.listeners.add(listener);
    if (syntheticFallbackEnabled) {
      for (const symbol of symbols) {
        const a = this.assets.get(symbol);
        if (a && !this.isLive(a)) this.applySynthetic(symbol);
      }
      this.ensureSyntheticTimer();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }
}
