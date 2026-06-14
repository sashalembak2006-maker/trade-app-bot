import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichMarketStatusWithCollector,
  resolveCollectorConnectionState,
  shouldShowCollectorHealthBanner,
} from './collector-connection.js';
import { DEFAULT_COLLECTOR_STATUS } from './collector-types.js';

const liveBase = {
  mode: 'live' as const,
  configured: true,
  source: 'platform-bridge',
  assetCount: 183,
};

describe('resolveCollectorConnectionState', () => {
  it('CONNECTED when collector online + ws', () => {
    const s = {
      ...liveBase,
      collectorOnline: true,
      collectorWsConnected: true,
    };
    assert.equal(resolveCollectorConnectionState(s), 'CONNECTED');
    assert.equal(shouldShowCollectorHealthBanner(s), false);
  });

  it('CONNECTED when bridge ok but collector fields missing (150ms assets poll bug)', () => {
    const s = { ...liveBase };
    assert.equal(resolveCollectorConnectionState(s), 'CONNECTED');
    assert.equal(shouldShowCollectorHealthBanner(s), false);
  });

  it('AUTH_ERROR when message mentions PO_AUTH', () => {
    const s = {
      ...liveBase,
      collectorOnline: false,
      collectorWsConnected: false,
      collectorMessage: 'Auth failed — refresh PO_AUTH from PO Demo F12',
    };
    assert.equal(resolveCollectorConnectionState(s), 'AUTH_ERROR');
    assert.equal(shouldShowCollectorHealthBanner(s), true);
  });

  it('CONNECTED when bridge extension feeds but VPS collector is off', () => {
    const s = {
      mode: 'live' as const,
      configured: true,
      source: 'platform-bridge',
      assetCount: 7,
      bridgeStale: false,
      collectorOnline: false,
      collectorWsConnected: false,
      collectorMessage: 'Collector not connected',
    };
    assert.equal(resolveCollectorConnectionState(s), 'CONNECTED');
    assert.equal(shouldShowCollectorHealthBanner(s), false);
  });

  it('hide collector banner when bridge stale but collector intentionally off', () => {
    const s = {
      mode: 'live' as const,
      configured: false,
      stale: true,
      source: 'platform-bridge (STALE)',
      assetCount: 57,
      bridgeStale: true,
      bridgeConnected: false,
      collectorOnline: false,
      collectorWsConnected: false,
      collectorMessage: 'Collector not connected',
    };
    assert.equal(shouldShowCollectorHealthBanner(s), false);
  });

  it('DISCONNECTED when collector explicitly offline and no bridge', () => {
    const s = {
      mode: 'live' as const,
      configured: false,
      source: 'platform-bridge (waiting for data)',
      assetCount: 0,
      collectorOnline: false,
      collectorWsConnected: false,
    };
    assert.equal(resolveCollectorConnectionState(s), 'DISCONNECTED');
  });

  it('RECONNECTING when online but ws down and no bridge feed', () => {
    const s = {
      mode: 'live' as const,
      configured: false,
      source: 'platform-bridge (waiting for data)',
      assetCount: 0,
      collectorOnline: true,
      collectorWsConnected: false,
    };
    assert.equal(resolveCollectorConnectionState(s), 'RECONNECTING');
  });
});

describe('enrichMarketStatusWithCollector', () => {
  it('adds collector fields from heartbeat', () => {
    const out = enrichMarketStatusWithCollector(liveBase, {
      ...DEFAULT_COLLECTOR_STATUS,
      online: true,
      wsConnected: true,
      pricedCount: 48,
      message: 'changeSymbol → EUR/USD OTC',
      version: '1.5.23-auth-catalog',
    });
    assert.equal(out.collectorOnline, true);
    assert.equal(out.collectorWsConnected, true);
    assert.equal(out.collectorPricedCount, 48);
  });
});
