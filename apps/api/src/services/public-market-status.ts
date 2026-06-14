import { enrichMarketStatusWithCollector, type MarketStatusWithCollector } from '@trade-app/shared';
import { getMarketStatus } from '../market.js';
import { getBridgeMonitorSnapshot } from './bridge-status.js';
import { getCollectorStatus } from './collector-status.js';

/** Full public market status for /api/market/status and /api/assets dataSource. */
export function getPublicMarketStatus(): MarketStatusWithCollector {
  const status = getMarketStatus();
  const bridge = getBridgeMonitorSnapshot();
  const collector = getCollectorStatus();
  return {
    ...enrichMarketStatusWithCollector(status, collector),
    bridgeConnected: bridge.connected,
    bridgeStale: bridge.stale,
    bridgeLastUpdate: bridge.lastUpdate,
  };
}
