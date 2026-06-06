import { log } from '../logger.js';

export interface FocusRequest {
  symbol: string;
  requestedAt: number;
  expiresAt: number;
}

let current: FocusRequest | null = null;

const DEFAULT_FOCUS_TTL_MS = 60_000;

/** Ask bridge/collector to switch to this symbol and stream live price. */
export function requestFocus(symbol: string, ttlMs = DEFAULT_FOCUS_TTL_MS): FocusRequest {
  const now = Date.now();
  current = {
    symbol,
    requestedAt: now,
    expiresAt: now + ttlMs,
  };
  log.info('Focus requested for signal', { symbol });
  return current;
}

export function getFocus(): FocusRequest | null {
  if (!current) return null;
  if (Date.now() > current.expiresAt) {
    current = null;
    return null;
  }
  return current;
}

export function clearFocus(symbol?: string): void {
  if (!current) return;
  if (!symbol || current.symbol === symbol) current = null;
}
