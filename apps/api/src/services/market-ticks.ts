import type { BridgeAssetInput } from '@trade-app/shared';
import { MarketTickStore, isPlausibleMarketPrice } from '@trade-app/shared';

let store: MarketTickStore | null = null;

export function getTickStore(): MarketTickStore {
  if (!store) store = new MarketTickStore();
  return store;
}

export function clearTickStore(): void {
  getTickStore().clear();
}

const TRUSTED_PO_SOURCES = new Set(['vps-collector', 'bridge-extension', 'platform-bridge']);

export function recordBridgeTicks(
  assets: BridgeAssetInput[],
  activeSymbol?: string | null,
  source?: string,
): void {
  if (source && !TRUSTED_PO_SOURCES.has(source)) return;
  const tickStore = getTickStore();
  const now = Date.now();
  for (const a of assets) {
    if (!a.symbol) continue;
    if (a.live === true && typeof a.price === 'number') {
      if (!isPlausibleMarketPrice(a.price, a.symbol)) continue;
      tickStore.record(a.symbol, a.price, a.timestamp ?? now, { payout: a.payout, live: true });
      continue;
    }
    const catalog =
      typeof a.price === 'number'
        ? a.price
        : typeof a.lastKnownPrice === 'number'
          ? a.lastKnownPrice
          : null;
    if (catalog != null && isPlausibleMarketPrice(catalog, a.symbol)) {
      tickStore.record(a.symbol, catalog, a.timestamp ?? now, {
        payout: a.payout,
        live: a.live === true,
      });
      tickStore.setCatalogPrice(a.symbol, catalog, a.timestamp ?? now, a.payout);
    } else if (typeof a.payout === 'number') {
      const prev = tickStore.query(a.symbol, 0);
      if (prev.latest != null) {
        tickStore.record(a.symbol, prev.latest, now, { payout: a.payout });
      } else if (prev.catalog != null) {
        tickStore.setCatalogPrice(a.symbol, prev.catalog, now, a.payout);
      }
    }
  }
  void activeSymbol;
}
