import { SignalEngine } from '../../../../packages/shared/src/signal/engine';
import type { Asset, SignalResult } from '../types';
import { api } from './api';

const engine = new SignalEngine();

/** Latest PO quote — asset list first, optional quick tick poll. */
export async function resolvePoEntryPrice(symbol: string, asset: Asset): Promise<number | null> {
  const fromList = asset.price ?? asset.lastKnownPrice ?? null;
  try {
    const ticks = await Promise.race([
      api.getTicks(symbol, 0),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
    ]);
    if (ticks) {
      const p = ticks.display ?? (ticks.live ? ticks.latest : null) ?? ticks.catalog ?? fromList;
      if (p != null && p > 0) return p;
    }
  } catch {
    /* fall through */
  }
  return fromList != null && fromList > 0 ? fromList : null;
}

export function generateLocalSignal(input: {
  asset: Asset;
  timeframe: string;
  entryPrice: number;
}): SignalResult {
  return engine.generate({
    assetId: input.asset.id,
    symbol: input.asset.symbol,
    timeframe: input.timeframe,
    price: input.entryPrice,
    payout: input.asset.payout,
    isOTC: input.asset.isOTC,
  }) as SignalResult;
}

export function recordSignalBackground(result: SignalResult): void {
  void api
    .recordSignal({
      id: result.id,
      symbol: result.symbol,
      assetId: result.assetId,
      direction: result.direction,
      timeframe: result.timeframe,
      entryPrice: result.entryPrice,
      confidence: result.confidence,
      payout: result.payout,
      market: result.market,
      expiresAt: result.expiresAt,
    })
    .catch(() => {});
}
