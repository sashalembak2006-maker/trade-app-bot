import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { getMarketProvider, onProviderChange } from './market.js';
import { log } from './logger.js';

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientSymbols = new Map<WebSocket, Set<string>>();
  let unsubscribe: (() => void) | null = null;
  const allSymbols = new Set<string>();

  function refreshSubscription() {
    if (unsubscribe) unsubscribe();
    const symbols = Array.from(allSymbols);
    if (symbols.length === 0) return;

    unsubscribe = getMarketProvider().subscribe(symbols, (data) => {
      const payload = JSON.stringify({ type: 'price_update', data });
      for (const [ws, subs] of clientSymbols) {
        if (ws.readyState === WebSocket.OPEN && subs.has(data.symbol)) {
          ws.send(payload);
        }
      }
    });
  }

  // When the market provider is swapped at runtime (mode switch), rebind the
  // active subscription so clients keep receiving live updates.
  onProviderChange(() => refreshSubscription());

  wss.on('connection', (ws) => {
    clientSymbols.set(ws, new Set());
    log.info(`WS client connected (total: ${clientSymbols.size})`);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        const subs = clientSymbols.get(ws);
        if (!subs) return;

        if (msg.type === 'subscribe') {
          for (const s of msg.symbols) {
            subs.add(s);
            allSymbols.add(s);
          }
          refreshSubscription();
        } else if (msg.type === 'unsubscribe') {
          for (const s of msg.symbols) subs.delete(s);
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });

    ws.on('close', () => {
      clientSymbols.delete(ws);
      log.info(`WS client disconnected (total: ${clientSymbols.size})`);
    });

    ws.on('error', (err) => log.warn('WS client error', err.message));

    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket ready', dataSource: getMarketProvider().status }));
  });

  return wss;
}
