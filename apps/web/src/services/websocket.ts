import type { PriceUpdate } from '../hooks/useWebSocket';
import { logger } from './logger';

type MessageHandler = (data: PriceUpdate) => void;
type StatusHandler = (connected: boolean) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private symbols = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;
  private reconnectAttempt = 0;

  connect() {
    // Dev: connect straight to API — Vite WS proxy is flaky on some Windows setups.
    const url =
      import.meta.env.VITE_WS_URL ??
      (import.meta.env.DEV
        ? 'ws://127.0.0.1:3001/ws'
        : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manualClose = false;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      logger.error('WS', 'connect failed', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      logger.info('WS', 'connected', url);
      this.emitStatus(true);
      if (this.symbols.size > 0) {
        this.send({ type: 'subscribe', symbols: Array.from(this.symbols) });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'price_update') {
          for (const h of this.handlers) h(msg.data as PriceUpdate);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    this.ws.onerror = () => {
      logger.warn('WS', 'socket error');
    };

    this.ws.onclose = () => {
      this.emitStatus(false);
      if (!this.manualClose) {
        logger.warn('WS', 'disconnected — reconnecting in 3s');
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(15_000, 1000 * 2 ** Math.min(this.reconnectAttempt, 4));
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private emitStatus(connected: boolean) {
    for (const h of this.statusHandlers) h(connected);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  subscribe(symbols: string[], handler: MessageHandler) {
    for (const s of symbols) this.symbols.add(s);
    this.handlers.add(handler);
    this.connect();
    this.send({ type: 'subscribe', symbols });
    return () => {
      this.handlers.delete(handler);
    };
  }

  private send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.manualClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WebSocketClient();
