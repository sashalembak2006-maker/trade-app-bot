import { SignalEngine } from '../../../../packages/shared/src/signal/engine';
import type { Asset, SignalResult } from '../types';
import { api } from './api';
import { useAppStore } from '../store/useAppStore';

const engine = new SignalEngine();

/** Fastest PO quote — live tick store first (same pipeline as PO when focused). */
export async function fetchFreshPoPrice(symbol: string): Promise<number | null> {
  try {
    const ticks = await api.getTicks(symbol, 0);
    if (ticks.live && ticks.latest != null && ticks.latest > 0) return ticks.latest;
    if (ticks.display != null && ticks.display > 0) return ticks.display;
    if (ticks.latest != null && ticks.latest > 0) return ticks.latest;
    if (ticks.catalog != null && ticks.catalog > 0) return ticks.catalog;
  } catch {
    /* fall through */
  }

  const row = useAppStore.getState().assets.find((a) => a.symbol === symbol);
  const fromList = row?.price ?? row?.lastKnownPrice ?? null;
  if (fromList != null && fromList > 0) return fromList;

  try {
    const live = await api.getLivePrice(symbol, 500);
    if (live.price != null && live.price > 0) return live.price;
  } catch {
    /* no price */
  }
  return null;
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

/** Read in-memory ticks only — no network wait (countdown UI). */
export async function readPoTickPrice(symbol: string): Promise<number | null> {
  try {
    const ticks = await api.getTicks(symbol, 0);
    if (ticks.live && ticks.latest != null) return ticks.latest;
    return ticks.display ?? ticks.latest ?? ticks.catalog ?? null;
  } catch {
    const row = useAppStore.getState().assets.find((a) => a.symbol === symbol);
    return row?.price ?? row?.lastKnownPrice ?? null;
  }
}
