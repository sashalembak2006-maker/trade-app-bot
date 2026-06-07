import { Router } from 'express';
import type { BridgeAssetInput } from '@trade-app/shared';
import { getBridgeProvider, getMarketMode, setMarketMode } from '../market.js';
import { getFocus } from '../services/focus.js';
import { onBridgeIngest } from '../services/bridge-status.js';
import { log } from '../logger.js';

const router = Router();

/**
 * Receives live asset data from the browser extension (Platform Bridge).
 * Auth: shared secret via `x-bridge-secret` header (BRIDGE_SECRET).
 */
router.post('/assets/update', (req, res) => {
  const secret = process.env.BRIDGE_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'BRIDGE_SECRET not configured on server' });
  }
  if (req.headers['x-bridge-secret'] !== secret) {
    log.warn('Bridge update rejected: bad secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const assets = Array.isArray(req.body?.assets) ? (req.body.assets as BridgeAssetInput[]) : [];
  if (assets.length === 0) {
    return res.status(400).json({ error: 'No assets provided' });
  }

  const activeSymbol =
    typeof req.body?.activeSymbol === 'string' && req.body.activeSymbol.trim()
      ? req.body.activeSymbol.trim()
      : null;

  const bridge = getBridgeProvider();
  const accepted = bridge.ingest(assets, activeSymbol);
  const sanitized = bridge.sanitize();
  if (sanitized > 0) {
    log.warn('Bridge sanitized corrupted prices', { sanitized });
  }
  if (accepted > 0 && getMarketMode() !== 'platform') {
    setMarketMode('platform');
    log.info('Bridge connected — switched market mode to platform');
  }
  if (accepted > 0) onBridgeIngest(accepted);
  if (accepted > 0) bridge.pulseSubscribers();
  log.debug('Bridge data ingested', { accepted, source: req.body?.source });
  res.json({ ok: true, accepted, status: bridge.status });
});

router.get('/status', (_req, res) => {
  res.json(getBridgeProvider().status);
});

/** Polled by bridge extension / collector — which asset needs live price focus. */
router.get('/focus', (_req, res) => {
  const focus = getFocus();
  res.json(focus ?? { symbol: null });
});

export default router;
