import { isPlausibleMarketPrice } from '@trade-app/shared';
import type { BridgeMarketDataProvider } from '@trade-app/shared';
import { getTickStore } from './market-ticks.js';

/** Latest live PO tick from in-memory store (<5s). */
export function livePriceFromTickStore(symbol: string): number | null {
  const q = getTickStore().query(symbol, 0);
  if (q.live && q.latest != null && isPlausibleMarketPrice(q.latest, symbol)) {
    return q.latest;
  }
  return null;
}

/** PO catalog / last scan quote — real, not synthetic. */
export function catalogPriceFromTickStore(symbol: string): number | null {
  const q = getTickStore().query(symbol, 0);
  const candidates = [q.display, q.catalog, q.latest];
  for (const price of candidates) {
    if (price != null && isPlausibleMarketPrice(price, symbol)) return price;
  }
  return null;
}

/**
 * Fast path for signals — prefer live, fall back to recent PO scan/catalog.
 * Avoids blocking second+ signals when live stream briefly pauses.
 */
export function resolveSignalEntryPrice(
  symbol: string,
  provider: BridgeMarketDataProvider,
): { price: number | null; source: 'live_tick' | 'catalog_tick' | 'bridge_live' | 'bridge_catalog' | null } {
  const fromLiveTicks = livePriceFromTickStore(symbol);
  if (fromLiveTicks != null) return { price: fromLiveTicks, source: 'live_tick' };

  const fromCatalogTicks = catalogPriceFromTickStore(symbol);
  if (fromCatalogTicks != null) return { price: fromCatalogTicks, source: 'catalog_tick' };

  if (provider.hasLivePrice(symbol)) {
    const quote = provider.getBridgeQuote(symbol, 4_000);
    if (quote != null && isPlausibleMarketPrice(quote, symbol)) {
      return { price: quote, source: 'bridge_live' };
    }
  }

  const catalog = provider.getBridgeQuote(symbol, 120_000);
  if (catalog != null && isPlausibleMarketPrice(catalog, symbol)) {
    return { price: catalog, source: 'bridge_catalog' };
  }

  return { price: null, source: null };
}

/** @deprecated use resolveSignalEntryPrice */
export function resolveLiveSignalPrice(
  symbol: string,
  provider: BridgeMarketDataProvider,
): number | null {
  return resolveSignalEntryPrice(symbol, provider).price;
}
