import WebSocket from 'ws';
import {
  displaySymbolToPoAsset,
  parseUpdateAssetsPayload,
  parseUpdateStreamTick,
  poSymbolToDisplay,
  type BridgeAssetInput,
} from '@trade-app/shared';

export interface PocketWsConfig {
  wsUrl: string;
  /** Full Socket.IO auth frame, e.g. 42["auth",{...}] */
  authMessage: string;
  onStatus?: (msg: string) => void;
}

export interface PocketWsSnapshot {
  assets: BridgeAssetInput[];
  activeSymbol: string | null;
  wsConnected: boolean;
  message: string;
}

/**
 * Connects to Pocket Option Socket.IO feed (same protocol the web terminal uses).
 * - updateAssets → all pairs + payout %
 * - updateStream → live price for ONE active symbol at a time
 */
export class PocketWsClient {
  private ws: WebSocket | null = null;
  private assets = new Map<string, BridgeAssetInput>();
  private poAssetBySymbol = new Map<string, string>();
  private activeSymbol: string | null = null;
  private lastFocusSymbol: string | null = null;
  private pendingStream = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private stopped = false;
  private connected = false;
  private lastMessage = 'initializing';

  constructor(private readonly cfg: PocketWsConfig) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  snapshot(): PocketWsSnapshot {
    return {
      assets: Array.from(this.assets.values()),
      activeSymbol: this.activeSymbol,
      wsConnected: this.connected,
      message: this.lastMessage,
    };
  }

  /** Rotate through OTC pairs when no user signal focus — real updateStream ticks. */
  scanNextOtc(): void {
    const symbols = Array.from(this.assets.keys())
      .filter((s) => /\sOTC$/i.test(s) && /^[A-Z]{3}\/[A-Z]{3}/i.test(s.replace(/\s+OTC$/i, '')))
      .sort();
    if (symbols.length === 0) return;
    if (!this.scanIndex) this.scanIndex = 0;
    const sym = symbols[this.scanIndex % symbols.length];
    this.scanIndex = (this.scanIndex + 1) % symbols.length;
    this.requestSymbol(sym);
  }

  private scanIndex = 0;

  /** Ask PO to stream ticks for `displaySymbol` (used when API requests focus for signals). */
  requestSymbol(displaySymbol: string): void {
    if (!displaySymbol || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) return;
    if (this.lastFocusSymbol === displaySymbol) return;
    const poAsset =
      this.poAssetBySymbol.get(displaySymbol) ?? displaySymbolToPoAsset(displaySymbol);
    if (!poAsset) return;
    this.lastFocusSymbol = displaySymbol;
    this.ws.send(`42["changeSymbol",{"asset":"${poAsset}"}]`);
    this.activeSymbol = displaySymbol;
    this.status(`changeSymbol → ${displaySymbol} (${poAsset})`);
  }

  /** Bridge ingest: all pairs with payout; catalog price on every row; live tick on active only. */
  assetsForBridge(): BridgeAssetInput[] {
    const active = this.activeSymbol;
    return Array.from(this.assets.values())
      .filter((a) => /\sOTC$/i.test(a.symbol) && /^[A-Z]{3}\/[A-Z]{3}/i.test(a.symbol.replace(/\s+OTC$/i, '')))
      .map((a) => {
        const lkp = a.lastKnownPrice ?? a.price;
        const base = {
          ...a,
          ...(lkp != null ? { lastKnownPrice: lkp, price: lkp } : {}),
        };
        if (active && a.symbol === active && a.price != null) {
          return { ...base, price: a.price, live: true };
        }
        const { live: _l, ...rest } = base;
        return rest;
      });
  }

  private connect(): void {
    if (this.stopped) return;
    this.status(`Connecting to ${this.cfg.wsUrl}…`);

    try {
      // PO sits behind Cloudflare — a bare Node WS (no Origin/User-Agent) is
      // rejected and the socket closes immediately. Send browser-like headers.
      this.ws = new WebSocket(this.cfg.wsUrl, {
        headers: {
          Origin: 'https://pocketoption.com',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
    } catch (e) {
      this.scheduleReconnect(e instanceof Error ? e.message : 'connect failed');
      return;
    }

    this.ws.on('open', () => {
      this.reconnectAttempt = 0;
      this.status('WebSocket open');
    });

    this.ws.on('message', (raw) => this.handleMessage(raw));

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.connected = false;
      const why = reason && reason.length ? ` ${reason.toString('utf8').slice(0, 80)}` : '';
      this.scheduleReconnect(`socket closed (code ${code}${why})`);
    });

    this.ws.on('unexpected-response', (_req, res) => {
      this.connected = false;
      this.scheduleReconnect(`HTTP ${res.statusCode} (handshake rejected)`);
    });

    this.ws.on('error', (err) => {
      this.connected = false;
      this.status(`WS error: ${err.message}`);
    });
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopped) return;
    this.connected = false;
    const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt++;
    this.status(`Reconnect in ${Math.round(delay / 1000)}s (${reason})`);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private status(msg: string): void {
    this.lastMessage = msg;
    this.cfg.onStatus?.(msg);
  }

  private handleMessage(raw: WebSocket.RawData): void {
    const text = typeof raw === 'string' ? raw : raw.toString('utf8');

    if (text === '2') {
      this.ws?.send('3');
      return;
    }
    if (text.startsWith('0{')) {
      this.ws?.send('40');
      return;
    }
    if (text.startsWith('40{')) {
      this.ws?.send(this.cfg.authMessage);
      return;
    }

    if (this.pendingStream) {
      this.pendingStream = false;
      try {
        const data = JSON.parse(text);
        const tick = parseUpdateStreamTick(data);
        if (tick?.price != null) {
          const sym = tick.symbol ?? this.activeSymbol;
          if (sym) {
            this.activeSymbol = sym;
            const prev = this.assets.get(sym);
            if (prev) {
              this.assets.set(sym, { ...prev, price: tick.price, timestamp: Date.now(), live: true });
            }
          }
        }
      } catch { /* ignore */ }
      return;
    }

    const chunks: string[] = [text];
    if (text.includes('-[')) chunks.push(text.slice(text.indexOf('-[') + 1));
    const bracket = text.indexOf('[');
    if (bracket >= 0) chunks.push(text.slice(bracket));

    for (const chunk of chunks) {
      try {
        const arr = JSON.parse(chunk);
        if (!Array.isArray(arr) || arr.length < 1) continue;

        if (arr[0] === 'successauth') {
          this.connected = true;
          this.status('Authenticated — waiting for updateAssets');
          continue;
        }

        if (arr[0] === 'updateAssets' && arr[1]) {
          const parsed = parseUpdateAssetsPayload(arr[1]);
          for (const a of parsed) {
            const prev = this.assets.get(a.symbol);
            if (a.poAsset) this.poAssetBySymbol.set(a.symbol, a.poAsset);
            const lkp = a.lastKnownPrice ?? a.price ?? prev?.lastKnownPrice ?? prev?.price;
            this.assets.set(a.symbol, {
              ...prev,
              ...a,
              lastKnownPrice: lkp ?? prev?.lastKnownPrice,
              price: prev?.price ?? a.price ?? lkp,
              timestamp: Date.now(),
            });
          }
          this.status(`updateAssets: ${parsed.length} pairs`);
          continue;
        }

        if (arr[0] === 'updateStream') {
          if (arr[1] != null) {
            const inline = parseUpdateStreamTick(arr[1]);
            if (inline?.price != null) {
              const sym = inline.symbol ?? this.activeSymbol;
              if (sym) {
                this.activeSymbol = sym;
                const prev = this.assets.get(sym);
                if (prev) {
                  this.assets.set(sym, { ...prev, price: inline.price, timestamp: Date.now() });
                }
              }
            }
          }
          this.pendingStream = true;
          continue;
        }

        if (arr[0] === 'changeSymbol' && arr[1]?.asset) {
          this.activeSymbol = poSymbolToDisplay(String(arr[1].asset));
          continue;
        }
      } catch { /* try next chunk */ }
    }
  }
}
