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

/** Fast path for signals — live tick only, never stale catalog. */
export function resolveLiveSignalPrice(
  symbol: string,
  provider: BridgeMarketDataProvider,
): number | null {
  const fromTicks = livePriceFromTickStore(symbol);
  if (fromTicks != null) return fromTicks;

  if (!provider.hasLivePrice(symbol)) return null;

  const quote = provider.getBridgeQuote(symbol, 4_000);
  if (quote != null && isPlausibleMarketPrice(quote, symbol)) return quote;
  return null;
}
