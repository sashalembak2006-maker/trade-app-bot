import { Router } from 'express';
import { resolveTickAssetQuery } from '@trade-app/shared';
import { getTickStore } from '../services/market-ticks.js';

const router = Router();

/**
 * Live ticks per asset (creator-style API).
 * GET /api/ticks?asset=eurusd_otc&since=1738...
 */
router.get('/ticks', (req, res) => {
  const raw = String(req.query.asset ?? req.query.symbol ?? '').trim();
  const symbol = resolveTickAssetQuery(raw);
  if (!symbol) {
    return res.status(400).json({ error: 'Missing or invalid asset', code: 'BAD_ASSET' });
  }
  const since = Math.max(0, Number(req.query.since) || 0);
  const result = getTickStore().query(symbol, since);
  res.setHeader('Cache-Control', 'no-store');
  return res.json(result);
});

export default router;
