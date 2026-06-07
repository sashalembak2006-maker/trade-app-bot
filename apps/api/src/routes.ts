import { Router } from 'express';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import bridgeRoutes from './routes/bridge.js';
import collectorRoutes from './routes/collector.js';
import botAdminRoutes from './routes/bot-admin.js';
import { getMarketStatus, getMarketMode, setMarketMode, isRuntimeModeSwitchAllowed } from './market.js';
import { getBridgeMonitorSnapshot } from './services/bridge-status.js';
import { log } from './logger.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PRIME TRADE BOT', market: getMarketStatus(), bridge: getBridgeMonitorSnapshot() });
});

/** Public market data-source status — drives the data-source badge + signal gating. */
router.get('/market/status', (_req, res) => {
  const status = getMarketStatus();
  const bridge = getBridgeMonitorSnapshot();
  res.json({
    ...status,
    activeMode: getMarketMode(),
    bridgeConnected: bridge.connected,
    bridgeStale: bridge.stale,
    bridgeLastUpdate: bridge.lastUpdate,
  });
});

/** Runtime mode switch — powers the "Enable Demo Mode" button. */
router.post('/market/mode', (req, res) => {
  if (!isRuntimeModeSwitchAllowed()) {
    return res.status(403).json({ error: 'Runtime mode switch is disabled in production' });
  }
  const mode = req.body?.mode;
  if (mode !== 'mock' && mode !== 'platform' && mode !== 'unconfigured') {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  const status = setMarketMode(mode);
  log.info('Market mode changed via API', { mode });
  res.json({ ...status, activeMode: getMarketMode() });
});

router.use('/bridge', bridgeRoutes);
router.use('/collector', collectorRoutes);
router.use('/bot-admin', botAdminRoutes);
router.use('/', userRoutes);
router.use('/admin', adminRoutes);

export default router;
