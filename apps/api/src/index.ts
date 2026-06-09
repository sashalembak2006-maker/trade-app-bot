import 'dotenv/config';
import { patchBigIntJson } from './utils/json.js';
patchBigIntJson();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import routes from './routes.js';
import { setupWebSocket } from './websocket.js';
import { seedAdmin } from './services/admin-seed.js';
import { log, requestLogger } from './logger.js';
import { setBridgeSyntheticFallback, setBridgeAnchoredPulse } from '@trade-app/shared';
import { getMarketStatus } from './market.js';
import { startBridgeMonitor } from './services/bridge-status.js';

/** Real PO prices only — never synthetic micro-ticks unless explicitly enabled. */
const isPlatformBridge = process.env.MARKET_DATA_MODE?.trim() === 'platform';
const syntheticFallback = process.env.PLATFORM_SYNTHETIC_FALLBACK === 'true';
setBridgeSyntheticFallback(syntheticFallback);

const anchoredPulse = process.env.BRIDGE_ANCHORED_PULSE === 'true';
setBridgeAnchoredPulse(anchoredPulse);

const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const app = express();
const server = createServer(app);

const isDev = process.env.NODE_ENV !== 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      const allowed = (process.env.CORS_ORIGIN ?? '').split(',').map((o) => o.trim());
      if (allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PRIME TRADE BOT', market: getMarketStatus() });
});

app.use('/api', routes);

// Production: serve built Mini App (set WEB_DIST_PATH or defaults to apps/web/dist)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = process.env.WEB_DIST_PATH
  ? path.resolve(process.env.WEB_DIST_PATH)
  : path.resolve(__dirname, '../../web/dist');
const indexHtml = path.join(webDist, 'index.html');

if (process.env.NODE_ENV === 'production' || process.env.SERVE_WEB === 'true') {
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(webDist, { index: false }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.resolve(indexHtml), (err) => {
        if (err) {
          log.error('Mini App sendFile failed', { webDist, err: err.message });
          res.status(503).json({
            error: 'Mini App static files unavailable',
            code: 'WEB_DIST_ERROR',
            webDist,
          });
        }
      });
    });
    log.info('Serving Mini App static files', { webDist });
  } else {
    log.warn('Mini App dist missing — static routes disabled', { webDist, indexHtml });
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.status(503).json({
        error: 'Mini App not built — run web build or set WEB_DIST_PATH=/app/apps/web/dist',
        code: 'WEB_DIST_MISSING',
        webDist,
      });
    });
  }
}

// Last-resort error handler — never leak stack traces, always JSON.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled API error', err instanceof Error ? err.message : err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

setupWebSocket(server);

process.on('unhandledRejection', (reason) => log.error('Unhandled promise rejection', reason));
process.on('uncaughtException', (err) => log.error('Uncaught exception', err.message));

// Bridge cache survives restart — data rebuilds from incoming extension/collector pushes.
startBridgeMonitor();

seedAdmin()
  .catch((e) => log.error('Admin seed failed', e instanceof Error ? e.message : e))
  .finally(() => {
    server.listen(PORT, '0.0.0.0', () => {
      log.info(`PRIME TRADE BOT API: http://127.0.0.1:${PORT}`);
      log.info(`WebSocket: ws://127.0.0.1:${PORT}/ws`);
      log.info('Market data source', getMarketStatus());
    });
  });
