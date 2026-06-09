import WebSocket from 'ws';
import {
  displaySymbolToPoAsset,
  parseUpdateAssetsPayload,
  parseUpdateStreamTick,
  poSymbolToDisplay,
  type BridgeAssetInput,
} from '@trade-app/shared';
import {
  decodeMsgPack,
  finishBinaryAssembly,
  isPlaceholder,
  parseSocketIoTextFrame,
} from './po-binary.js';

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
  private pendingBinary: { attachmentCount: number; payload: unknown[]; received: Buffer[] } | null =
    null;
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
      this.connected = false;
      this.status('WebSocket open — waiting for PO handshake');
      // Fallback: some edges stall before 0{ — nudge Socket.IO connect.
      setTimeout(() => {
        if (!this.stopped && this.ws?.readyState === WebSocket.OPEN && !this.connected) {
          this.ws.send('40');
        }
      }, 800);
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

  private applyUpdateAssets(data: unknown): void {
    const parsed = parseUpdateAssetsPayload(data);
    const now = Date.now();
    for (const a of parsed) {
      const prev = this.assets.get(a.symbol);
      if (a.poAsset) this.poAssetBySymbol.set(a.symbol, a.poAsset);
      const catalog = a.lastKnownPrice ?? a.price;
      const lkp = catalog ?? prev?.lastKnownPrice ?? prev?.price;
      const livePrice =
        typeof a.price === 'number'
          ? a.price
          : typeof catalog === 'number'
            ? catalog
            : prev?.price;
      this.assets.set(a.symbol, {
        ...prev,
        ...a,
        lastKnownPrice: lkp ?? prev?.lastKnownPrice,
        price: livePrice ?? lkp ?? prev?.price,
        timestamp: now,
      });
    }
    if (parsed.length) this.status(`updateAssets: ${parsed.length} pairs`);
  }

  private applyUpdateStream(data: unknown): void {
    const tick = parseUpdateStreamTick(data);
    if (tick?.price == null) return;
    const sym = tick.symbol ?? this.activeSymbol;
    if (!sym) return;
    this.activeSymbol = sym;
    const prev = this.assets.get(sym);
    if (prev) {
      this.assets.set(sym, {
        ...prev,
        price: tick.price,
        lastKnownPrice: tick.price,
        timestamp: Date.now(),
        live: true,
      });
    }
  }

  private dispatchEvent(event: string, data: unknown): void {
    const ev = event.toLowerCase();
    if (ev === 'successauth' || ev === 'success') {
      this.connected = true;
      this.status('Authenticated — waiting for updateAssets');
      return;
    }
    if (ev.includes('notauthorized') || ev.includes('authfail') || ev === 'disconnect') {
      this.connected = false;
      this.status(`Auth failed (${event}) — refresh PO_AUTH from PO Demo F12`);
      return;
    }
    if (event === 'updateAssets' && data != null) {
      this.applyUpdateAssets(data);
      return;
    }
    if (event === 'updateStream') {
      if (data != null && !isPlaceholder(data)) this.applyUpdateStream(data);
      else this.pendingStream = true;
      return;
    }
    if (event === 'changeSymbol' && data && typeof data === 'object' && 'asset' in data) {
      this.activeSymbol = poSymbolToDisplay(String((data as { asset: string }).asset));
    }
  }

  private tryFinishBinary(): void {
    if (!this.pendingBinary) return;
    if (this.pendingBinary.received.length < this.pendingBinary.attachmentCount) return;
    const done = finishBinaryAssembly(this.pendingBinary.payload, this.pendingBinary.received);
    this.pendingBinary = null;
    if (done) this.dispatchEvent(done.event, done.data);
  }

  private handleBinaryChunk(buf: Buffer): void {
    if (this.pendingBinary) {
      this.pendingBinary.received.push(buf);
      this.tryFinishBinary();
      return;
    }
    if (this.pendingStream) {
      this.pendingStream = false;
      try {
        this.applyUpdateStream(decodeMsgPack(buf));
      } catch {
        try {
          this.applyUpdateStream(JSON.parse(buf.toString('utf8')));
        } catch {
          /* ignore */
        }
      }
      return;
    }
    try {
      this.applyUpdateStream(decodeMsgPack(buf));
    } catch {
      /* orphan binary */
    }
  }

  private looksLikeSocketIoText(buf: Buffer): boolean {
    if (buf.length === 0) return true;
    const c = buf[0];
    // Socket.IO text: 0{…}, 2, 3, 40{…}, 42[…], 451-[…]
    return c === 0x30 || c === 0x32 || c === 0x33 || c === 0x34 || (c >= 0x35 && c <= 0x39);
  }

  private handleText(text: string): void {
    if (text === '2') {
      this.ws?.send('3');
      return;
    }
    if (text.startsWith('0{')) {
      this.ws?.send('40');
      return;
    }
    if (text.startsWith('40{')) {
      this.status('Sending auth…');
      this.ws?.send(this.cfg.authMessage);
      return;
    }

    if (text.includes('NotAuthorized') || text.includes('notAuthorized')) {
      this.connected = false;
      this.status('Auth rejected — refresh PO_AUTH from Demo F12');
      return;
    }

    const frame = parseSocketIoTextFrame(text);
    if (frame?.pendingBinary) {
      this.pendingBinary = frame.pendingBinary;
      this.tryFinishBinary();
      return;
    }
    if (frame) {
      this.dispatchEvent(frame.event, frame.data);
      return;
    }

    if (this.pendingStream) {
      this.pendingStream = false;
      try {
        this.applyUpdateStream(JSON.parse(text));
      } catch {
        /* ignore */
      }
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
        this.dispatchEvent(String(arr[0]), arr[1]);
      } catch {
        /* try next chunk */
      }
    }
  }

  private handleMessage(raw: WebSocket.RawData): void {
    if (Buffer.isBuffer(raw)) {
      // Node `ws` delivers TEXT frames as Buffer too — must not treat as binary.
      if (this.looksLikeSocketIoText(raw)) {
        this.handleText(raw.toString('utf8'));
        return;
      }
      this.handleBinaryChunk(raw);
      return;
    }
    if (raw instanceof ArrayBuffer) {
      const buf = Buffer.from(raw);
      if (this.looksLikeSocketIoText(buf)) {
        this.handleText(buf.toString('utf8'));
        return;
      }
      this.handleBinaryChunk(buf);
      return;
    }

    this.handleText(String(raw));
  }
}
