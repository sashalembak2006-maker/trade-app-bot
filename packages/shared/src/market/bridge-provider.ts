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
import { isPlausibleMarketPrice, isForexOtcSymbol } from './price-validation.js';
import { SyntheticPriceEngine } from './synthetic-price.js';
import { resolveAssetFlags } from './asset-flags.js';
import { normalizeAssetCategory, resolveAssetCategory } from './asset-category.js';

let syntheticFallbackEnabled = true;
let anchoredPulseEnabled = false;

/** API sets this from PLATFORM_SYNTHETIC_FALLBACK env (default on in dev). */
export function setBridgeSyntheticFallback(enabled: boolean): void {
  syntheticFallbackEnabled = enabled;
}

export function isBridgeSyntheticFallbackEnabled(): boolean {
  return syntheticFallbackEnabled;
}

/** Real lastKnownPrice micro-ticks only — no random seed (production default). */
export function setBridgeAnchoredPulse(enabled: boolean): void {
  anchoredPulseEnabled = enabled;
}

export function isBridgeAnchoredPulseEnabled(): boolean {
  return anchoredPulseEnabled;
}

interface StoredAsset {
  symbol: string;
  price: number | null;
  /** Last real tick — kept even when live stream stops. */
  lastKnownPrice: number | null;
  priceUpdatedAt: number;
  /** Last real PO/bridge tick (never set by synthetic). */
  bridgeLiveAt: number;
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
/** Non-active pairs: micro-ticks for Mini App list (~10/s). */
const SYNTHETIC_TICK_MS = 100;

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
  private anchoredPulseTimer: ReturnType<typeof setInterval> | null = null;
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

  /** Real PO / catalog anchor only — never hash-seeded fake quotes. */
  private displayPrice(a: StoredAsset): number | null {
    if (a.price != null && isPlausibleMarketPrice(a.price, a.symbol)) return a.price;
    if (a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)) {
      return a.lastKnownPrice;
    }
    return null;
  }

  /** Quote for signal — live tick first, then fresh display price when hybrid fallback on. */
  private bridgeQuotePrice(a: StoredAsset): number | null {
    if (this.isBridgeLive(a)) {
      if (a.price != null && isPlausibleMarketPrice(a.price, a.symbol)) return a.price;
      if (
        a.lastKnownPrice != null &&
        isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)
      ) {
        return a.lastKnownPrice;
      }
    }
    if (syntheticFallbackEnabled) {
      const display = this.displayPrice(a);
      if (display != null) return display;
    }
    return null;
  }

  private applySynthetic(symbol: string): number {
    const prev = this.assets.get(symbol);
    const anchor =
      prev?.lastKnownPrice != null && isPlausibleMarketPrice(prev.lastKnownPrice, symbol)
        ? prev.lastKnownPrice
        : prev?.price != null && isPlausibleMarketPrice(prev.price, symbol)
          ? prev.price
          : null;
    if (anchor == null) {
      throw new NoLivePriceError(`No anchored PO price for ${symbol}`);
    }
    if (!this.synthetic.has(symbol)) this.synthetic.anchor(symbol, anchor);
    const tick = this.synthetic.tick(symbol);
    const price = tick ?? anchor;
    const now = Date.now();
    const stored: StoredAsset = {
      symbol,
      price,
      lastKnownPrice:
        prev?.lastKnownPrice != null && isPlausibleMarketPrice(prev.lastKnownPrice, symbol)
          ? prev.lastKnownPrice
          : anchor,
      priceUpdatedAt: now,
      bridgeLiveAt: prev?.bridgeLiveAt ?? 0,
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

  private tickSyntheticSymbol(symbol: string, a: StoredAsset, now: number): StoredAsset {
    if (this.isBridgeLive(a)) return a;
    // Fresh hybrid price from bridge POST (extension catalog pulse) — do not overwrite.
    if (
      a.price != null &&
      isPlausibleMarketPrice(a.price, symbol) &&
      a.priceUpdatedAt > 0 &&
      now - a.priceUpdatedAt < 250
    ) {
      return a;
    }
    let anchor =
      a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, symbol)
        ? a.lastKnownPrice
        : null;
    if (anchor == null) return a;
    if (!this.synthetic.has(symbol)) this.synthetic.anchor(symbol, anchor);
    let price = this.synthetic.tick(symbol);
    if (price == null) price = a.lastKnownPrice ?? a.price;
    if (price == null) return a;
    const prev = a.price ?? a.lastKnownPrice ?? price;
    let change = a.change;
    if (prev != null && prev > 0 && price !== prev) {
      change = roundChangePct(((price - prev) / prev) * 100);
    }
    const next: StoredAsset = {
      ...a,
      price,
      priceUpdatedAt: now,
      change,
    };
    this.assets.set(symbol, next);
    this.usingSynthetic = true;
    this.emit({ symbol, price, payout: next.payout, change, ts: now });
    return next;
  }

  /** Micro-ticks from last real PO price — keeps OTC list moving between bridge POSTs. */
  private refreshAllSyntheticPrices(): void {
    if (!syntheticFallbackEnabled || this.assets.size === 0) return;
    const now = Date.now();
    for (const [symbol, a] of this.assets) {
      if (!isForexOtcSymbol(symbol)) continue;
      if (this.isBridgeLive(a)) continue;
      this.tickSyntheticSymbol(symbol, a, now);
    }
  }

  private ensureSyntheticTimer(): void {
    if (this.syntheticTimer || !syntheticFallbackEnabled) return;
    this.syntheticTimer = setInterval(() => this.refreshAllSyntheticPrices(), SYNTHETIC_TICK_MS);
  }

  private ensureAnchoredPulseTimer(): void {
    if (this.anchoredPulseTimer || !anchoredPulseEnabled || syntheticFallbackEnabled) return;
    this.anchoredPulseTimer = setInterval(() => {
      if (this.assets.size === 0) return;
      const now = Date.now();
      for (const [symbol, a] of this.assets) {
        if (this.isBridgeLive(a)) continue;
        if (a.lastKnownPrice == null || !isPlausibleMarketPrice(a.lastKnownPrice, symbol)) continue;
        if (!this.synthetic.has(symbol)) this.synthetic.anchor(symbol, a.lastKnownPrice);
        const price = this.synthetic.tick(symbol);
        if (price == null) continue;
        const prev = a.price ?? a.lastKnownPrice;
        let change = a.change;
        if (prev != null && prev > 0 && price !== prev) {
          change = roundChangePct(((price - prev) / prev) * 100);
        }
        a.price = price;
        a.priceUpdatedAt = now;
        a.change = change;
        this.assets.set(symbol, a);
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
    return !!a && this.isBridgeLive(a);
  }

  private isBridgeLive(a: StoredAsset): boolean {
    return a.bridgeLiveAt > 0 && Date.now() - a.bridgeLiveAt <= PRICE_STALE_MS;
  }

  private isLive(a: StoredAsset): boolean {
    return this.isBridgeLive(a);
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
    const safeTimeout =
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 12_000) : 4_000;
    const allowSynthetic = options?.allowSynthetic ?? syntheticFallbackEnabled;
    const immediate = this.assets.get(symbol);
    if (immediate) {
      const liveQuote = this.bridgeQuotePrice(immediate);
      if (liveQuote != null) return liveQuote;
    }
    if (allowSynthetic && syntheticFallbackEnabled && immediate) {
      const display = this.displayPrice(immediate);
      if (display != null) return display;
    }

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + safeTimeout;
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearInterval(interval);
        unsub();
        fn();
      };
      const unsub = this.subscribe([symbol], () => {
        const a = this.assets.get(symbol);
        if (!a) return;
        const liveQuote = this.bridgeQuotePrice(a);
        if (liveQuote != null) finish(() => resolve(liveQuote));
      });
      const interval = setInterval(() => {
        const a = this.assets.get(symbol);
        if (a) {
          const liveQuote = this.bridgeQuotePrice(a);
          if (liveQuote != null) {
            finish(() => resolve(liveQuote));
            return;
          }
        }
        if (Date.now() >= deadline) {
          finish(() => {
            if (allowSynthetic && syntheticFallbackEnabled && this.assets.has(symbol)) {
              resolve(this.applySynthetic(symbol));
              return;
            }
            reject(new NoLivePriceError(`No live price for ${symbol} within ${safeTimeout}ms`));
          });
        }
      }, 200);
    });
  }

  /** Latest PO quote — live tick or fresh display from bridge. */
  getBridgeQuote(symbol: string, maxAgeMs = 30_000): number | null {
    const a = this.assets.get(symbol);
    if (!a) return null;
    if (this.isBridgeLive(a)) {
      if (a.price != null && isPlausibleMarketPrice(a.price, a.symbol)) return a.price;
      if (
        a.lastKnownPrice != null &&
        isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)
      ) {
        return a.lastKnownPrice;
      }
    }
    const display = this.displayPrice(a);
    if (display == null) return null;
    if (maxAgeMs > 0 && a.priceUpdatedAt > 0 && Date.now() - a.priceUpdatedAt > maxAgeMs) {
      if (a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)) {
        return a.lastKnownPrice;
      }
      return null;
    }
    return display;
  }

  /** Latest PO quote — live tick or fresh anchored display. */
  getLivePrice(symbol: string): number | null {
    return this.getBridgeQuote(symbol, 60_000);
  }

  ingest(input: BridgeAssetInput[], activeSymbol?: string | null): number {
    const now = Date.now();
    let count = 0;
    const normalizedActive = activeSymbol?.trim() || null;

    for (const a of input) {
      if (!a.symbol || typeof a.payout !== 'number') continue;
      if (!isForexOtcSymbol(a.symbol)) continue;
      const isOTC = a.isOTC ?? /otc/i.test(a.symbol);
      const prev = this.assets.get(a.symbol);
      const rawPrice = typeof a.price === 'number' ? a.price : null;
      const rawLkp = typeof a.lastKnownPrice === 'number' ? a.lastKnownPrice : null;
      const validPrice =
        rawPrice != null && isPlausibleMarketPrice(rawPrice, a.symbol) ? rawPrice : null;
      const validLkp =
        rawLkp != null && isPlausibleMarketPrice(rawLkp, a.symbol) ? rawLkp : null;
      const prevLkp =
        prev?.lastKnownPrice != null && isPlausibleMarketPrice(prev.lastKnownPrice, a.symbol)
          ? prev.lastKnownPrice
          : null;
      let prevLive =
        prev?.price != null && isPlausibleMarketPrice(prev.price, a.symbol) ? prev.price : null;

      const isFocused = normalizedActive != null && a.symbol === normalizedActive;
      const isSyntheticPulse = a.synthetic === true;
      const isLiveTick = validPrice != null && a.live === true && !isSyntheticPulse;
      let priceUpdatedAt = prev?.priceUpdatedAt ?? 0;
      let bridgeLiveAt = prev?.bridgeLiveAt ?? 0;
      if (isLiveTick) {
        priceUpdatedAt = a.timestamp ?? now;
        bridgeLiveAt = now;
        this.synthetic.anchor(a.symbol, validPrice!);
      } else if (isFocused && prevLive != null) {
        // Active pair heartbeat without a new tick — keep previous live price fresh.
        priceUpdatedAt = now;
        bridgeLiveAt = now;
      } else if (validPrice != null && !isSyntheticPulse) {
        // Catalog/DOM snapshot — refresh display anchor (not live stream).
        priceUpdatedAt = a.timestamp ?? now;
        if (isFocused) bridgeLiveAt = now;
      }

      const effectivePrice = isLiveTick
        ? validPrice
        : isFocused
          ? (validPrice ?? prevLive)
          : isSyntheticPulse
            ? prevLive
            : (validPrice ?? prevLive);
      const prevForChange = prev?.price ?? prev?.lastKnownPrice;
      let change = prev?.change ?? 0;
      if (validPrice != null && prevForChange != null && prevForChange > 0 && validPrice !== prevForChange) {
        change = roundChangePct(((validPrice - prevForChange) / prevForChange) * 100);
      }

      let nextLastKnown =
        validPrice != null && !isSyntheticPulse
          ? validPrice
          : validLkp != null
            ? validLkp
            : isLiveTick
              ? (validPrice ?? prevLkp)
              : prevLkp;
      const lastKnownUpdated = nextLastKnown != null && nextLastKnown !== prevLkp;

      const stored: StoredAsset = {
        symbol: a.symbol,
        price: effectivePrice,
        lastKnownPrice: nextLastKnown,
        priceUpdatedAt,
        bridgeLiveAt,
        payout: a.payout,
        change,
        category: normalizeAssetCategory(a.category, a.symbol, isOTC),
        isOTC,
        updatedAt: a.timestamp ?? now,
      };
      this.assets.set(a.symbol, stored);
      count++;

      if (
        syntheticFallbackEnabled &&
        stored.lastKnownPrice != null &&
        isPlausibleMarketPrice(stored.lastKnownPrice, a.symbol) &&
        !this.synthetic.has(a.symbol)
      ) {
        this.synthetic.anchor(a.symbol, stored.lastKnownPrice);
      }

      let emitPrice =
        validPrice ??
        (effectivePrice != null && (this.isBridgeLive(stored) || isFocused) ? effectivePrice : null);
      if (emitPrice == null && lastKnownUpdated && stored.lastKnownPrice != null) {
        const display = this.displayPrice(stored);
        if (display != null) emitPrice = display;
      }
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
        this.refreshAllSyntheticPrices();
      } else if (anchoredPulseEnabled) this.ensureAnchoredPulseTimer();
      this.pulseSubscribers();
    }
    return count;
  }

  /** @deprecated use refreshAllSyntheticPrices */
  private warmSyntheticPrices(): void {
    this.refreshAllSyntheticPrices();
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
    return Array.from(this.assets.values()).map((a) => {
      const display = this.displayPrice(a);
      return {
        symbol: a.symbol,
        price: display,
        payout: a.payout,
        source: 'platform-bridge',
        lastUpdated: a.updatedAt,
        stale: !this.isLive(a) && display == null,
      };
    });
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
    if (syntheticFallbackEnabled && this.assets.size > 0) {
      this.ensureSyntheticTimer();
      this.refreshAllSyntheticPrices();
    }
    return Array.from(this.assets.values())
      .filter((a) => isForexOtcSymbol(a.symbol))
      .map((a) => {
      const display = this.displayPrice(a);
      return {
      id: a.symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      symbol: a.symbol,
      name: a.symbol.replace(/ otc$/i, ''),
      category: a.category,
      isOTC: a.isOTC,
      price: display,
      lastKnownPrice:
        a.lastKnownPrice != null && isPlausibleMarketPrice(a.lastKnownPrice, a.symbol)
          ? a.lastKnownPrice
          : syntheticFallbackEnabled && display != null
            ? display
            : null,
      payout: a.payout,
      change: a.change,
      flags: resolveAssetFlags(a.symbol),
      favorite: false,
    };
    });
  }

  private requireConfigured(): void {
    if (!this.status.configured) throw new DataSourceNotConfiguredError();
  }

  async getAssetPrice(symbol: string): Promise<number> {
    this.requireConfigured();
    const asset = this.assets.get(symbol);
    if (!asset) throw new DataSourceNotConfiguredError(`No bridge data for ${symbol}`);
    const quote = this.getBridgeQuote(symbol, 60_000);
    if (quote != null) return quote;
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
        if (
          a &&
          a.lastKnownPrice != null &&
          isPlausibleMarketPrice(a.lastKnownPrice, symbol) &&
          !this.synthetic.has(symbol)
        ) {
          this.synthetic.anchor(symbol, a.lastKnownPrice);
        }
      }
      this.ensureSyntheticTimer();
    } else if (anchoredPulseEnabled) {
      for (const symbol of symbols) {
        const a = this.assets.get(symbol);
        if (
          a &&
          a.lastKnownPrice != null &&
          isPlausibleMarketPrice(a.lastKnownPrice, symbol) &&
          !this.synthetic.has(symbol)
        ) {
          this.synthetic.anchor(symbol, a.lastKnownPrice);
        }
      }
      this.ensureAnchoredPulseTimer();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }
}
