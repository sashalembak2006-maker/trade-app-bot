import type { MartingaleMultiplier, SignalDirection, TradeSettlement } from '../types';

const PRICE_EPS = 1e-7;

export function settleSignal(
  direction: SignalDirection,
  entryPrice: number,
  exitPrice: number,
  multiplier: MartingaleMultiplier = 1,
): TradeSettlement {
  if (Math.abs(exitPrice - entryPrice) < PRICE_EPS) {
    return {
      outcome: 'undetermined',
      entryPrice,
      exitPrice,
      direction,
      multiplier,
    };
  }

  const won =
    direction === 'CALL' ? exitPrice > entryPrice : exitPrice < entryPrice;

  return {
    outcome: won ? 'win' : 'loss',
    entryPrice,
    exitPrice,
    direction,
    multiplier,
  };
}

export function nextMartingaleMultiplier(current: MartingaleMultiplier): MartingaleMultiplier | null {
  if (current === 1) return 2;
  if (current === 2) return 4;
  return null;
}

export function timeframeToMs(tf: string): number {
  const map: Record<string, number> = {
    '3s': 3000, '5s': 5000, '15s': 15000, '30s': 30000,
    '1m': 60000, '2m': 120000, '3m': 180000, '5m': 300000,
    '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000,
  };
  return map[tf] ?? 60000;
}
