import {
  MockMarketDataProvider,
  BridgeMarketDataProvider,
  UnconfiguredMarketProvider,
} from '@trade-app/shared';
import type { MarketDataProvider, MarketDataStatus } from '@trade-app/shared';
import { log } from './logger.js';

export type MarketMode = 'mock' | 'platform' | 'unconfigured';

let provider: MarketDataProvider;
let currentMode: MarketMode;
// The bridge instance is kept alive across mode switches so data sent by the
// extension is not lost if someone toggles modes.
let bridge: BridgeMarketDataProvider | null = null;

const changeListeners = new Set<() => void>();
export function onProviderChange(cb: () => void): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}
function notifyProviderChange() {
  for (const cb of changeListeners) cb();
}

function ensureBridge(): BridgeMarketDataProvider {
  if (!bridge) bridge = new BridgeMarketDataProvider();
  return bridge;
}

function createProvider(mode: MarketMode): MarketDataProvider {
  if (mode === 'platform') return ensureBridge();
  if (mode === 'mock') return new MockMarketDataProvider();
  return new UnconfiguredMarketProvider();
}

function resolveInitialMode(): MarketMode {
  const isProd = process.env.NODE_ENV === 'production';
  const raw = process.env.MARKET_DATA_MODE;
  if (raw === 'platform' || raw === 'bridge') return 'platform';
  if (raw === 'mock') return 'mock';
  // Production with bridge secret(s) → platform bridge (extension/collector ingest).
  const hasBridgeSecret =
    Boolean(process.env.BRIDGE_SECRET?.trim()) ||
    Boolean(process.env.BRIDGE_SECRETS?.split(',').some((s) => s.trim()));
  if (isProd && hasBridgeSecret) return 'platform';
  return isProd ? 'unconfigured' : 'mock';
}

export function getMarketProvider(): MarketDataProvider {
  if (provider) return provider;
  currentMode = resolveInitialMode();
  provider = createProvider(currentMode);
  log.info('Market data provider initialized', { activeMode: currentMode, ...provider.status });
  return provider;
}

export function getMarketMode(): MarketMode {
  getMarketProvider();
  return currentMode;
}

/** Runtime switch (used by the "Enable Demo Mode" button + admin debug panel). */
export function setMarketMode(mode: MarketMode): MarketDataStatus {
  getMarketProvider();
  if (mode !== currentMode) {
    currentMode = mode;
    provider = createProvider(mode);
    log.info('Market data mode switched', { activeMode: mode, ...provider.status });
    notifyProviderChange();
  }
  return provider.status;
}

export function isRuntimeModeSwitchAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.ALLOW_RUNTIME_MODE_SWITCH === 'true';
}

export function getMarketStatus(): MarketDataStatus {
  const active = getMarketProvider().status;
  const bridgeStatus = ensureBridge().status;
  // When bridge is receiving fresh POSTs, surface that even if active mode differs.
  if (bridgeStatus.configured && !active.configured) return bridgeStatus;
  if (active.mode === 'live' && bridgeStatus.lastUpdate && (bridgeStatus.lastUpdate ?? 0) > (active.lastUpdate ?? 0)) {
    return { ...active, ...bridgeStatus, mode: 'live' as const };
  }
  return active;
}

export function isMarketConfigured(): boolean {
  return getMarketProvider().status.configured;
}

/**
 * The live bridge provider. Always available for ingestion so the extension can
 * post data regardless of the active mode; data is only *served* in platform mode.
 */
export function getBridgeProvider(): BridgeMarketDataProvider {
  getMarketProvider();
  return ensureBridge();
}

export function getMockProvider(): MockMarketDataProvider | null {
  const p = getMarketProvider();
  return p instanceof MockMarketDataProvider ? p : null;
}
