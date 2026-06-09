import { Router } from 'express';
import { pocketForexOtcBridgeCatalog } from '@trade-app/shared';
import {
  acknowledgeCollectorRestart,
  getCollectorStatus,
  isCollectorRestartRequested,
  updateCollectorHeartbeat,
} from '../services/collector-status.js';
import { getBridgeProvider, getMarketMode, setMarketMode } from '../market.js';
import { onBridgeIngest } from '../services/bridge-status.js';
import { log } from '../logger.js';

const router = Router();
let lastApiSeedAt = 0;

function requireCollectorSecret(req: { headers: Record<string, unknown> }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  const secret = process.env.COLLECTOR_SECRET;
  if (!secret || req.headers['x-collector-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/** VPS Data Collector — heartbeat + config poll (every ~10s). */
router.post('/heartbeat', (req, res) => {
  if (!requireCollectorSecret(req, res)) return;

  const body = req.body ?? {};
  const next = updateCollectorHeartbeat({
    wsConnected: Boolean(body.wsConnected),
    assetCount: Number(body.assetCount) || 0,
    pricedCount: Number(body.pricedCount) || 0,
    activeSymbol: body.activeSymbol ?? null,
    message: String(body.message ?? 'ok'),
    version: String(body.version ?? 'unknown'),
  });

  log.debug('Collector heartbeat', {
    assets: next.assetCount,
    priced: next.pricedCount,
    ws: next.wsConnected,
  });

  const bridge = getBridgeProvider();
  if (
    next.wsConnected &&
    (bridge.status.assetCount ?? 0) === 0 &&
    Date.now() - lastApiSeedAt > 15_000
  ) {
    const catalog = pocketForexOtcBridgeCatalog();
    const accepted = bridge.ingest(catalog, next.activeSymbol ?? 'EUR/USD OTC');
    if (accepted > 0) {
      lastApiSeedAt = Date.now();
      if (getMarketMode() !== 'platform') setMarketMode('platform');
      onBridgeIngest(accepted);
      log.info('API auto-seeded OTC catalog', { accepted, pairs: catalog.length });
    }
  }

  res.json({
    ok: true,
    restartRequested: isCollectorRestartRequested(),
    status: next,
  });
});

/** Collector polls this to see if admin requested a restart. */
router.get('/config', (req, res) => {
  if (!requireCollectorSecret(req, res)) return;
  res.json({
    restartRequested: isCollectorRestartRequested(),
    pushIntervalMs: Number(process.env.COLLECTOR_PUSH_INTERVAL_MS ?? 1000),
  });
});

router.post('/restart-ack', (req, res) => {
  if (!requireCollectorSecret(req, res)) return;
  acknowledgeCollectorRestart();
  log.info('Collector acknowledged restart');
  res.json({ ok: true });
});

/** Public read-only collector status for admin dashboard. */
router.get('/status', (_req, res) => {
  res.json(getCollectorStatus());
});

export default router;
