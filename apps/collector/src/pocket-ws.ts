import WebSocket from 'ws';
import {
  displaySymbolToPoAsset,
  parseUpdateAssetsPayload,
  parseUpdateStreamTicks,
  poSymbolToDisplay,
  pocketForexOtcSymbolRegistry,
  isPlausibleMarketPrice,
  type BridgeAssetInput,
} from '@trade-app/shared';
import {
  decodeMsgPack,
  finishBinaryAssembly,
  isPlaceholder,
  parseSocketIoTextFrame,
} from './po-binary.js';

const DEFAULT_PO_WS_URLS = [
  'wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket',
  'wss://api-us.po.market/socket.io/?EIO=4&transport=websocket',
  'wss://api.po.market/socket.io/?EIO=4&transport=websocket',
];

export interface PocketWsConfig {
  wsUrl: string;
  /** Alternate PO endpoints if primary hangs or is blocked. */
  wsUrlFallbacks?: string[];
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
  private binaryQueue: Array<{
    attachmentCount: number;
    payload: unknown[];
    received: Buffer[];
  }> = [];
  private orphanBinaries: Array<{ buf: Buffer; at: number }> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private stopped = false;
  private connected = false;
  private lastMessage = 'initializing';
  private urlIndex = 0;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private gotEngineOpen = false;
  private readonly registrySymbols: string[];

  constructor(private readonly cfg: PocketWsConfig) {
    this.registrySymbols = pocketForexOtcSymbolRegistry()
      .map((a) => a.symbol)
      .sort();
  }

  private wsUrls(): string[] {
    const primary = this.cfg.wsUrl.trim();
    const fallbacks = (this.cfg.wsUrlFallbacks ?? [])
      .map((u) => u.trim())
      .filter(Boolean);
    const all = [primary, ...fallbacks];
    return [...new Set(all.length ? all : DEFAULT_PO_WS_URLS)];
  }

  private currentWsUrl(): string {
    const urls = this.wsUrls();
    return urls[this.urlIndex % urls.length] ?? urls[0]!;
  }

  private rotateWsUrl(): void {
    const urls = this.wsUrls();
    if (urls.length <= 1) return;
    this.urlIndex = (this.urlIndex + 1) % urls.length;
  }

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

  /** Rotate through all forex OTC pairs — real PO updateStream tick per pair. */
  scanNextOtc(): void {
    const symbols = this.forexOtcRotationQueue();
    if (symbols.length === 0) return;
    const sym = symbols[this.scanIndex % symbols.length]!;
    this.scanIndex = (this.scanIndex + 1) % symbols.length;
    this.lastFocusSymbol = null;
    this.requestSymbol(sym);
  }

  private forexOtcRotationQueue(): string[] {
    const fromPo = Array.from(this.assets.keys())
      .filter((s) => /\sOTC$/i.test(s) && /^[A-Z]{3}\/[A-Z]{3}/i.test(s.replace(/\s+OTC$/i, '')))
      .sort();
    if (fromPo.length >= this.registrySymbols.length) return fromPo;
    return this.registrySymbols.length ? this.registrySymbols : fromPo;
  }

  private scanIndex = 0;

  /** Ask PO to stream ticks for `displaySymbol` (used when API requests focus for signals). */
  requestSymbol(displaySymbol: string): void {
    if (!displaySymbol || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) return;
    const poAsset =
      this.poAssetBySymbol.get(displaySymbol) ?? displaySymbolToPoAsset(displaySymbol);
    if (!poAsset) return;
    this.lastFocusSymbol = displaySymbol;
    this.ws.send(`42["changeSymbol",{"asset":"${poAsset}","period":30}]`);
    this.ws.send(`42["subfor","${poAsset}"]`);
    this.activeSymbol = displaySymbol;
    this.status(`changeSymbol → ${displaySymbol}`);
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
        if (
          active &&
          a.symbol === active &&
          a.live === true &&
          a.price != null &&
          Date.now() - (a.timestamp ?? 0) < 4000
        ) {
          return { ...base, price: a.price, lastKnownPrice: a.price, live: true };
        }
        const { live: _l, ...rest } = base;
        return rest;
      });
  }

  private connect(): void {
    if (this.stopped) return;
    this.gotEngineOpen = false;
    const url = this.currentWsUrl();
    this.status(`Connecting to ${url}…`);

    try {
      // PO sits behind Cloudflare — a bare Node WS (no Origin/User-Agent) is
      // rejected and the socket closes immediately. Send browser-like headers.
      this.ws = new WebSocket(url, {
        handshakeTimeout: 12_000,
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
      this.rotateWsUrl();
      this.scheduleReconnect(e instanceof Error ? e.message : 'connect failed');
      return;
    }

    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      if (this.stopped || this.connected || this.gotEngineOpen) return;
      this.status('Connect timeout — trying next PO endpoint');
      this.ws?.terminate();
    }, 14_000);

    this.ws.on('open', () => {
      this.reconnectAttempt = 0;
      this.connected = false;
      this.status('WebSocket open — waiting for PO handshake');
    });

    this.ws.on('message', (raw) => this.handleMessage(raw));

    this.ws.on('close', (code: number, reason: Buffer) => {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.connected = false;
      const why = reason && reason.length ? ` ${reason.toString('utf8').slice(0, 80)}` : '';
      if (!this.gotEngineOpen) this.rotateWsUrl();
      this.scheduleReconnect(`socket closed (code ${code}${why})`);
    });

    this.ws.on('unexpected-response', (_req, res) => {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.connected = false;
      this.rotateWsUrl();
      this.scheduleReconnect(`HTTP ${res.statusCode} (handshake rejected)`);
    });

    this.ws.on('error', (err) => {
      if (this.connectTimer) clearTimeout(this.connectTimer);
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
    const rows = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { assets?: unknown[] }).assets)
        ? (data as { assets: unknown[] }).assets
        : null;
    if (!rows) {
      this.status('updateAssets payload not array — waiting for binary');
      return;
    }
    const parsed = parseUpdateAssetsPayload(rows);
    const now = Date.now();
    for (const a of parsed) {
      const prev = this.assets.get(a.symbol);
      if (a.poAsset) this.poAssetBySymbol.set(a.symbol, a.poAsset);

      const streamLive =
        prev?.live === true &&
        a.symbol === this.activeSymbol &&
        Date.now() - (prev.timestamp ?? 0) < 4000;

      if (streamLive && prev) {
        this.assets.set(a.symbol, {
          ...prev,
          payout: a.payout ?? prev.payout,
          poAsset: a.poAsset ?? prev.poAsset,
        });
        continue;
      }

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
        live: false,
        lastKnownPrice: lkp ?? prev?.lastKnownPrice,
        price: livePrice ?? lkp ?? prev?.price,
        timestamp: now,
      });
    }
    if (parsed.length) {
      this.status(`updateAssets: ${parsed.length} pairs (${rows.length} rows)`);
    } else if (rows.length) {
      this.status(`updateAssets: 0 parsed from ${rows.length} rows`);
    }
  }

  private applyUpdateStream(data: unknown): void {
    const ticks = parseUpdateStreamTicks(data, this.activeSymbol ?? undefined);
    if (!ticks.length) return;
    for (const tick of ticks) {
      if (tick.price == null || !isPlausibleMarketPrice(tick.price, tick.symbol)) continue;
      const sym = tick.symbol ?? this.activeSymbol;
      if (!sym) continue;
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
      } else {
        this.assets.set(sym, {
          symbol: sym,
          poAsset: displaySymbolToPoAsset(sym),
          payout: 0,
          isOTC: /\sOTC$/i.test(sym),
          price: tick.price,
          lastKnownPrice: tick.price,
          timestamp: Date.now(),
          live: true,
        });
      }
      this.status(`updateStream → ${sym} ${tick.price}`);
    }
  }

  private dispatchEvent(event: string, data: unknown): void {
    const ev = event.toLowerCase();
    if (ev === 'successauth' || ev === 'success') {
      this.connected = true;
      this.status('Authenticated — waiting for PO data');
      setTimeout(() => this.nudgeAfterAuth(), 400);
      setTimeout(() => {
        if (this.assets.size === 0 && this.connected) this.nudgeAfterAuth();
      }, 8000);
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
    if (event === 'updateCloseValue' && data != null) {
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

  private nudgeAfterAuth(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) return;
    this.registerSymbolRegistry();
    const asset = 'EURUSD_otc';
    this.ws.send('42["favorite/load"]');
    this.ws.send('42["indicator/load"]');
    this.ws.send('42["price-alert/load"]');
    this.ws.send(`42["subscribeSymbol","${asset}"]`);
    this.ws.send(`42["changeSymbol",{"asset":"${asset}","period":30}]`);
    this.ws.send(`42["subfor","${asset}"]`);
    this.activeSymbol = 'EUR/USD OTC';
    this.status(`PO bootstrap · ${this.registrySymbols.length} OTC pairs queued`);
  }

  /** Register symbol names for rotation — prices only from PO updateStream/updateAssets. */
  private registerSymbolRegistry(): void {
    for (const a of pocketForexOtcSymbolRegistry()) {
      if (a.poAsset) this.poAssetBySymbol.set(a.symbol, a.poAsset);
      const prev = this.assets.get(a.symbol);
      if (!prev) {
        this.assets.set(a.symbol, {
          symbol: a.symbol,
          poAsset: a.poAsset,
          payout: 0,
          isOTC: true,
        });
      }
    }
  }

  private pruneOrphans(): void {
    const now = Date.now();
    this.orphanBinaries = this.orphanBinaries.filter((o) => now - o.at < 4000);
  }

  private takeOrphanBinary(): Buffer | null {
    this.pruneOrphans();
    if (!this.orphanBinaries.length) return null;
    return this.orphanBinaries.shift()!.buf;
  }

  private queueBinaryAssembly(entry: {
    attachmentCount: number;
    payload: unknown[];
    received: Buffer[];
  }): void {
    while (entry.received.length < entry.attachmentCount) {
      const orphan = this.takeOrphanBinary();
      if (!orphan) break;
      entry.received.push(orphan);
    }
    this.binaryQueue.push(entry);
    this.drainBinaryQueue();
  }

  private pushOrphanBinary(buf: Buffer): void {
    this.pruneOrphans();
    this.orphanBinaries.push({ buf, at: Date.now() });
    while (this.orphanBinaries.length > 16) this.orphanBinaries.shift();
    if (this.binaryQueue.length) {
      const head = this.binaryQueue[0]!;
      while (head.received.length < head.attachmentCount) {
        const orphan = this.takeOrphanBinary();
        if (!orphan) break;
        head.received.push(orphan);
      }
      this.drainBinaryQueue();
    }
  }

  private drainBinaryQueue(): void {
    while (this.binaryQueue.length) {
      const head = this.binaryQueue[0]!;
      if (head.received.length < head.attachmentCount) break;
      this.binaryQueue.shift();
      const done = finishBinaryAssembly(head.payload, head.received);
      if (done) this.dispatchEvent(done.event, done.data);
    }
  }

  private tryFinishBinary(): void {
    this.drainBinaryQueue();
  }

  private handleBinaryChunk(buf: Buffer): void {
    if (this.binaryQueue.length) {
      const head = this.binaryQueue[0]!;
      if (head.received.length < head.attachmentCount) {
        head.received.push(buf);
        this.drainBinaryQueue();
        return;
      }
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

    this.pushOrphanBinary(buf);
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
      this.gotEngineOpen = true;
      if (this.connectTimer) clearTimeout(this.connectTimer);
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
      this.queueBinaryAssembly(frame.pendingBinary);
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
