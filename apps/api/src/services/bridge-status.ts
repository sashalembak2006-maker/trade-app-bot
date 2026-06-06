import { getBridgeProvider } from '../market.js';
import { log } from '../logger.js';

let lastConfigured: boolean | null = null;
let lastAssetCount = 0;
let monitorTimer: ReturnType<typeof setInterval> | null = null;

/** Called after each successful bridge ingest — logs connect / asset updates. */
export function onBridgeIngest(accepted: number): void {
  const status = getBridgeProvider().status;
  const configured = status.configured;

  if (lastConfigured !== configured) {
    if (configured) {
      log.info('Bridge connected', {
        assetCount: status.assetCount,
        lastUpdate: status.lastUpdate,
      });
    } else if (lastConfigured === true) {
      log.warn('Bridge disconnected', {
        assetCount: status.assetCount,
        lastUpdate: status.lastUpdate,
        stale: status.stale,
      });
    }
    lastConfigured = configured;
  }

  if (accepted > 0 && status.assetCount !== lastAssetCount) {
    log.info('Bridge assets updated', {
      assetCount: status.assetCount,
      accepted,
      lastUpdate: status.lastUpdate,
    });
    lastAssetCount = status.assetCount ?? 0;
  }
}

/** Polls bridge heartbeat — detects stale / reconnect after gaps. */
export function startBridgeMonitor(intervalMs = 10_000): void {
  if (monitorTimer) return;
  const bridge = getBridgeProvider();
  const initial = bridge.status;
  lastConfigured = initial.configured;
  lastAssetCount = initial.assetCount ?? 0;
  if (initial.lastUpdate) {
    log.info('Bridge status on startup', {
      configured: initial.configured,
      assetCount: initial.assetCount,
      lastUpdate: initial.lastUpdate,
      stale: initial.stale,
    });
  }

  monitorTimer = setInterval(() => {
    const status = getBridgeProvider().status;
    const configured = status.configured;

    if (lastConfigured !== configured) {
      if (configured) {
        log.info('Bridge reconnected', {
          assetCount: status.assetCount,
          lastUpdate: status.lastUpdate,
        });
      } else if (lastConfigured === true) {
        log.warn('Bridge disconnected (heartbeat stale)', {
          assetCount: status.assetCount,
          lastUpdate: status.lastUpdate,
        });
      }
      lastConfigured = configured;
    }

    if (status.assetCount !== lastAssetCount) {
      log.info('Bridge asset count changed', {
        assetCount: status.assetCount,
        lastUpdate: status.lastUpdate,
      });
      lastAssetCount = status.assetCount ?? 0;
    }
  }, intervalMs);
}

export function getBridgeMonitorSnapshot() {
  const status = getBridgeProvider().status;
  return {
    connected: status.configured,
    stale: status.stale ?? false,
    assetCount: status.assetCount ?? 0,
    lastUpdate: status.lastUpdate ?? null,
  };
}
