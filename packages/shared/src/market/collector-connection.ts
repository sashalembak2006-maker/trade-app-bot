import type { CollectorStatus } from './collector-types.js';
import type { MarketDataStatus } from '../types/index.js';

export type CollectorConnectionState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'AUTH_ERROR';

export type MarketStatusWithCollector = MarketDataStatus & {
  collectorOnline?: boolean;
  collectorWsConnected?: boolean;
  collectorMessage?: string;
  collectorVersion?: string;
  collectorPricedCount?: number;
  bridgeConnected?: boolean;
  bridgeStale?: boolean;
  bridgeLastUpdate?: number | null;
  activeMode?: 'mock' | 'platform' | 'unconfigured';
  hybridPrices?: boolean;
};

/** Attach VPS collector heartbeat fields to any market status payload (API + /assets). */
export function enrichMarketStatusWithCollector(
  base: MarketDataStatus,
  collector: CollectorStatus,
): MarketStatusWithCollector {
  return {
    ...base,
    collectorOnline: collector.online,
    collectorWsConnected: collector.wsConnected,
    collectorMessage: collector.message,
    collectorVersion: collector.version,
    collectorPricedCount: collector.pricedCount,
  };
}

const AUTH_MSG = /auth|notauthorized|refresh PO_AUTH/i;

/** Derive UI connection state — avoids false DISCONNECTED when collector fields were stripped. */
export function resolveCollectorConnectionState(
  status: MarketStatusWithCollector | null | undefined,
): CollectorConnectionState {
  if (!status || status.mode === 'mock') return 'CONNECTED';

  const msg = status.collectorMessage ?? '';
  if (AUTH_MSG.test(msg)) return 'AUTH_ERROR';

  const bridgeFeedOk =
    status.configured === true &&
    status.bridgeStale !== true &&
    (status.assetCount ?? 0) > 0;

  const collectorOk =
    status.collectorOnline === true && status.collectorWsConnected === true;

  // VPS collector 24/7 — primary data path (no Chrome extension).
  if (collectorOk && (status.assetCount ?? 0) > 0) return 'CONNECTED';

  // Chrome Bridge extension mode — collector intentionally off on Railway.
  if (bridgeFeedOk && !AUTH_MSG.test(msg)) return 'CONNECTED';

  const online = status.collectorOnline === true;
  const wsOk = status.collectorWsConnected === true;
  const bridgeOk = status.configured === true && (status.assetCount ?? 0) > 0;

  if (online && wsOk) return 'CONNECTED';
  if (online && !wsOk) return 'RECONNECTING';

  // /api/assets used to overwrite marketStatus every 150ms without collector fields.
  if (status.collectorOnline === undefined && bridgeOk) return 'CONNECTED';

  if (!online && bridgeOk) return 'CONNECTED';

  if (status.collectorOnline === false && status.collectorWsConnected === false && !bridgeOk) {
    return 'DISCONNECTED';
  }

  return bridgeOk ? 'CONNECTED' : 'CONNECTING';
}

export function shouldShowCollectorHealthBanner(
  status: MarketStatusWithCollector | null | undefined,
): boolean {
  if (!status || status.mode === 'mock') return false;
  const state = resolveCollectorConnectionState(status);
  if (state === 'CONNECTED') return false;
  // Stream mode: VPS collector is off on purpose — never show "Collector not connected".
  if (state === 'DISCONNECTED' && status.collectorOnline === false) {
    const bridgeExpected =
      status.source?.includes('platform-bridge') === true ||
      status.bridgeConnected !== undefined ||
      (status.assetCount ?? 0) > 0;
    // 24/7 collector mode — hide bridge/collector offline noise when feed exists.
    if (bridgeExpected && (status.assetCount ?? 0) > 0 && status.configured === true) {
      return false;
    }
    if (bridgeExpected) return false;
  }
  return true;
}
