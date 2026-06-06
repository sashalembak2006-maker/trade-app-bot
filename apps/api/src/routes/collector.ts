import { Router } from 'express';
import {
  acknowledgeCollectorRestart,
  getCollectorStatus,
  isCollectorRestartRequested,
  updateCollectorHeartbeat,
} from '../services/collector-status.js';
import { log } from '../logger.js';

const router = Router();

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
