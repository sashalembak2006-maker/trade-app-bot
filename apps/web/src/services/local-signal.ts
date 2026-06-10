import { SignalEngine } from '../../../../packages/shared/src/signal/engine';
import type { Asset, SignalResult } from '../types';
import { api } from './api';

const engine = new SignalEngine();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Only PO updateStream tick — never catalog (matches PO chart). */
export async function fetchLivePoTick(symbol: string, maxWaitMs = 1500): Promise<number | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const ticks = await api.getTicks(symbol, 0);
      if (ticks.live && ticks.latest != null && ticks.latest > 0) return ticks.latest;
    } catch {
      /* retry */
    }
    await sleep(40);
  }
  return null;
}

/** Entry price after analysis — live stream only. */
export async function fetchFreshPoPrice(symbol: string): Promise<number | null> {
  return fetchLivePoTick(symbol, 1200);
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

/** Live PO price for countdown UI — null if stream not active. */
export async function readPoLivePrice(symbol: string): Promise<number | null> {
  try {
    const ticks = await api.getTicks(symbol, 0);
    if (ticks.live && ticks.latest != null) return ticks.latest;
  } catch {
    /* no live */
  }
  return null;
}
