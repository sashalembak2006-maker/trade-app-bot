import type { MartingaleMultiplier, SignalDirection, SignalStatus, TradeOutcome, TradeSettlement } from '../types';

const PRICE_EPS = 1e-7;

export function settleSignal(
  direction: SignalDirection,
  entryPrice: number,
  exitPrice: number,
  multiplier: MartingaleMultiplier = 1,
): Omit<TradeSettlement, 'status' | 'coverNeeded' | 'settledAt'> {
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

export function deriveSignalStatus(
  outcome: TradeOutcome,
  multiplier: MartingaleMultiplier,
  coverAvailable: boolean,
): SignalStatus {
  const isCover = multiplier > 1;
  if (outcome === 'win') return isCover ? 'COVER_WIN' : 'WIN';
  if (outcome === 'loss') {
    if (isCover) return 'COVER_LOSS';
    return coverAvailable ? 'NEED_COVER' : 'LOSS';
  }
  if (isCover) return 'COVER_LOSS';
  return coverAvailable ? 'NEED_COVER' : 'LOSS';
}

export function buildSettlement(
  direction: SignalDirection,
  entryPrice: number,
  exitPrice: number | null,
  multiplier: MartingaleMultiplier,
): TradeSettlement {
  const coverAvailable = nextMartingaleMultiplier(multiplier) != null;
  const settledAt = new Date().toISOString();

  if (exitPrice == null) {
    const status = deriveSignalStatus('undetermined', multiplier, coverAvailable);
    return {
      outcome: 'undetermined',
      status,
      entryPrice,
      exitPrice: null,
      direction,
      multiplier,
      coverNeeded: status === 'NEED_COVER',
      settledAt,
    };
  }

  const core = settleSignal(direction, entryPrice, exitPrice, multiplier);
  const status = deriveSignalStatus(core.outcome, multiplier, coverAvailable);
  return {
    ...core,
    status,
    coverNeeded: status === 'NEED_COVER',
    settledAt,
  };
}

export function nextMartingaleMultiplier(current: MartingaleMultiplier): MartingaleMultiplier | null {
  if (current === 1) return 2;
  if (current === 2) return 4;
  return null;
}

/** Overlay attempt number shown in UI (0 = initial signal, 1–2 = перекриття). */
export function overlayNumberFromMultiplier(multiplier: MartingaleMultiplier): number {
  if (multiplier === 2) return 1;
  if (multiplier === 4) return 2;
  return 0;
}

export function deriveRiskLevel(confidence: number, payout: number): 'low' | 'medium' | 'high' {
  if (confidence >= 85 && payout >= 75) return 'low';
  if (confidence >= 72) return 'medium';
  return 'high';
}

export function timeframeToMs(tf: string): number {
  const map: Record<string, number> = {
    '3s': 3000, '5s': 5000, '15s': 15000, '30s': 30000,
    '1m': 60000, '2m': 120000, '3m': 180000, '5m': 300000,
    '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000,
  };
  return map[tf] ?? 60000;
}
