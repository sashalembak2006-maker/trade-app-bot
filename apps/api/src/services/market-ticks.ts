import type { BridgeAssetInput } from '@trade-app/shared';
import { MarketTickStore } from '@trade-app/shared';

let store: MarketTickStore | null = null;

export function getTickStore(): MarketTickStore {
  if (!store) store = new MarketTickStore();
  return store;
}

export function recordBridgeTicks(assets: BridgeAssetInput[], activeSymbol?: string | null): void {
  getTickStore().ingestBatch(assets, activeSymbol);
}
