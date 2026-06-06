import type { Asset, PriceUpdate } from '../types/index.js';
import { resolveAssetFlags } from './asset-flags.js';
import { DataSourceNotConfiguredError } from './provider.js';

/** Quote from an official / approved Pocket Option data feed. */
export interface PocketQuote {
  symbol: string;
  payout: number;
  /** null when the platform does not publish a live price for this symbol. */
  price: number | null;
  isOTC: boolean;
  timestamp: number;
}

/**
 * Contract for an official Pocket Option data integration (partner API, licensed feed).
 * Implement this when you have documented API access — never fabricate prices.
 */
export interface OfficialPocketProvider {
  readonly connected: boolean;
  readonly lastUpdate: number | null;

  connect(): Promise<void>;
  disconnect(): void;

  /** All tradable assets the feed currently exposes. */
  getAssets(): Promise<PocketQuote[]>;

  /** symbol → payout % (1–100). */
  getPayouts(): Promise<Record<string, number>>;

  /** symbol → live price or null when unavailable. */
  getPrices(): Promise<Record<string, number | null>>;

  /** Live ticks — typically ONE active symbol at a time on Pocket Option. */
  subscribeToTicks(callback: (tick: PriceUpdate) => void): () => void;
}

/**
 * Placeholder until official API credentials are configured.
 * Reports unconfigured; never returns mock/random data.
 */
export class UnconfiguredOfficialPocketProvider implements OfficialPocketProvider {
  readonly connected = false;
  readonly lastUpdate = null;

  async connect(): Promise<void> {
    throw new DataSourceNotConfiguredError(
      'OfficialPocketProvider: set PLATFORM_API_URL + PLATFORM_API_KEY or run the VPS collector',
    );
  }

  disconnect(): void { /* noop */ }

  async getAssets(): Promise<PocketQuote[]> {
    throw new DataSourceNotConfiguredError('Official Pocket API not configured');
  }

  async getPayouts(): Promise<Record<string, number>> {
    throw new DataSourceNotConfiguredError('Official Pocket API not configured');
  }

  async getPrices(): Promise<Record<string, number | null>> {
    throw new DataSourceNotConfiguredError('Official Pocket API not configured');
  }

  subscribeToTicks(): () => void {
    return () => undefined;
  }
}

/** Map PocketQuote[] to Mini App Asset[] — never invents prices. */
export function pocketQuotesToAssets(quotes: PocketQuote[]): Asset[] {
  return quotes.map((q) => ({
    id: q.symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    symbol: q.symbol,
    name: q.symbol.replace(/ otc$/i, ''),
    category: q.isOTC ? 'forex_otc' : 'forex',
    isOTC: q.isOTC,
    price: q.price,
    payout: q.payout,
    change: 0,
    flags: resolveAssetFlags(q.symbol),
    favorite: false,
  }));
}
