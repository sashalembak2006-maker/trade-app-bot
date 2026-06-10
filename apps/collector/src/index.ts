import 'dotenv/config';
import { PocketWsClient } from './pocket-ws.js';
import { normalizePoAuthMessage } from './normalize-auth.js';

const VERSION = '1.5.12-live-prices';

function resolvePoAuthMessage(): string {
  const b64 = process.env.PO_AUTH_MESSAGE_B64?.trim();
  if (b64) {
    try {
      return normalizePoAuthMessage(Buffer.from(b64, 'base64').toString('utf8'));
    } catch {
      /* invalid base64 */
    }
  }
  return normalizePoAuthMessage(process.env.PO_AUTH_MESSAGE ?? '');
}

const PO_AUTH_MESSAGE = resolvePoAuthMessage();
const API_URL = (process.env.API_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? process.env.COLLECTOR_SECRET ?? '';
const COLLECTOR_SECRET = process.env.COLLECTOR_SECRET ?? BRIDGE_SECRET;
const PO_WS_URL = process.env.PO_WS_URL ?? '';
const PO_WS_FALLBACKS = (process.env.PO_WS_URL_FALLBACKS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PUSH_MS = Number(process.env.COLLECTOR_PUSH_INTERVAL_MS ?? 250);
const HEARTBEAT_MS = Number(process.env.COLLECTOR_HEARTBEAT_MS ?? 10000);

function log(msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) console.log(`[${ts}] [collector] ${msg}`, extra);
  else console.log(`[${ts}] [collector] ${msg}`);
}

let signalFocusUntil = 0;

async function pollFocus(client: PocketWsClient): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/bridge/focus`);
    if (!res.ok) return;
    const data = (await res.json()) as { symbol?: string | null; expiresAt?: number };
    if (data.symbol && data.expiresAt && Date.now() < data.expiresAt) {
      signalFocusUntil = data.expiresAt;
      client.requestSymbol(data.symbol);
      return;
    }
    signalFocusUntil = 0;
  } catch {
    /* API may be starting */
  }
}

async function pushAssets(client: PocketWsClient): Promise<void> {
  const snap = client.snapshot();
  const assets = client.assetsForBridge();
  if (assets.length === 0 || !BRIDGE_SECRET) return;

  const res = await fetch(`${API_URL}/api/bridge/assets/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bridge-secret': BRIDGE_SECRET,
    },
    body: JSON.stringify({
      source: 'vps-collector',
      assets,
      activeSymbol: snap.activeSymbol,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    log(`Bridge push failed HTTP ${res.status}`, body);
  }
}

async function sendHeartbeat(client: PocketWsClient): Promise<void> {
  if (!COLLECTOR_SECRET) return;
  const snap = client.snapshot();
  const pricedCount = snap.assets.filter((a) => typeof a.price === 'number').length;

  try {
    const res = await fetch(`${API_URL}/api/collector/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-collector-secret': COLLECTOR_SECRET,
      },
      body: JSON.stringify({
        wsConnected: snap.wsConnected,
        assetCount: snap.assets.length,
        pricedCount,
        activeSymbol: snap.activeSymbol,
        message: snap.message,
        version: VERSION,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { restartRequested?: boolean };
    if (body.restartRequested) {
      log('Admin requested restart — exiting for PM2/systemd');
      await fetch(`${API_URL}/api/collector/restart-ack`, {
        method: 'POST',
        headers: { 'x-collector-secret': COLLECTOR_SECRET },
      }).catch(() => {});
      process.exit(0);
    }
  } catch (e) {
    log('Heartbeat failed', e instanceof Error ? e.message : e);
  }
}

function main(): void {
  if (!BRIDGE_SECRET) {
    log('FATAL: set BRIDGE_SECRET (same as API .env)');
    process.exit(1);
  }
  if (!PO_WS_URL || !PO_AUTH_MESSAGE) {
    log('FATAL: set PO_WS_URL and PO_AUTH_MESSAGE — see PRODUCTION_ARCHITECTURE.md');
    process.exit(1);
  }

  log(`Starting VPS Data Collector v${VERSION}`);
  log(`API: ${API_URL} | push every ${PUSH_MS}ms`);
  if (PO_AUTH_MESSAGE.includes('sessionToken')) {
    log('WARN: PO_AUTH still uses sessionToken — set PO_AUTH_MESSAGE on Railway after redeploy');
  }

  const client = new PocketWsClient({
    wsUrl: PO_WS_URL,
    wsUrlFallbacks: PO_WS_FALLBACKS,
    authMessage: PO_AUTH_MESSAGE,
    onStatus: (m) => log(`PO: ${m}`),
  });

  client.start();

  setInterval(() => {
    void pushAssets(client);
  }, PUSH_MS);

  setInterval(() => {
    void pollFocus(client);
  }, 800);

  setInterval(() => {
    if (Date.now() < signalFocusUntil) return;
    client.scanNextOtc();
  }, Number(process.env.OTC_STREAM_MS ?? 350));

  setInterval(() => {
    void sendHeartbeat(client);
  }, HEARTBEAT_MS);

  void sendHeartbeat(client);
}

main();
