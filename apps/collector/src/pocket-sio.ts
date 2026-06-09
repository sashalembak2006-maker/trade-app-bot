import { io, type Socket } from 'socket.io-client';
import {
  displaySymbolToPoAsset,
  parseUpdateAssetsPayload,
  parseUpdateStreamTick,
  poSymbolToDisplay,
  type BridgeAssetInput,
} from '@trade-app/shared';

const LIVE_HOSTS = [
  'https://api-eu.po.market',
  'https://api-us.po.market',
  'https://api-fr.po.market',
];

const DEMO_HOSTS = [
  'https://demo-api-eu.po.market',
  'https://try-demo-eu.po.market',
  'https://api-eu.po.market',
];

export interface PocketWsConfig {
  wsUrl: string;
  wsUrlFallbacks?: string[];
  authMessage: string;
  onStatus?: (msg: string) => void;
}

export interface PocketWsSnapshot {
  assets: BridgeAssetInput[];
  activeSymbol: string | null;
  wsConnected: boolean;
  message: string;
}

function hostFromWsUrl(wsUrl: string): string {
  try {
    const u = new URL(wsUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return LIVE_HOSTS[0]!;
  }
}

function parseAuthPayload(authMessage: string): Record<string, unknown> | null {
  const start = authMessage.indexOf('{');
  const end = authMessage.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(authMessage.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isDemoAuth(auth: Record<string, unknown> | null): boolean {
  if (!auth) return false;
  return auth.isDemo === 1 || auth.isDemo === true || auth.isDemo === '1';
}

function hostsForAuth(auth: Record<string, unknown> | null, cfg: PocketWsConfig): string[] {
  const base = isDemoAuth(auth) ? DEMO_HOSTS : LIVE_HOSTS;
  const extra = [hostFromWsUrl(cfg.wsUrl), ...(cfg.wsUrlFallbacks ?? []).map(hostFromWsUrl)];
  return [...new Set([...base, ...extra].filter(Boolean))];
}

/** Socket.IO client — same decode path as PO browser (updateAssets binary works). */
export class PocketSioClient {
  private socket: Socket | null = null;
  private assets = new Map<string, BridgeAssetInput>();
  private poAssetBySymbol = new Map<string, string>();
  private activeSymbol: string | null = null;
  private lastFocusSymbol: string | null = null;
  private connected = false;
  private stopped = false;
  private lastMessage = 'initializing';
  private hostIndex = 0;
  private scanIndex = 0;
  private authPayload: Record<string, unknown> | null;
  private hostList: string[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private recentEvents: string[] = [];

  constructor(private readonly cfg: PocketWsConfig) {
    this.authPayload = parseAuthPayload(cfg.authMessage);
    this.hostList = hostsForAuth(this.authPayload, cfg);
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.socket?.disconnect();
    this.socket = null;
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

  scanNextOtc(): void {
    const symbols = Array.from(this.assets.keys())
      .filter((s) => /\sOTC$/i.test(s) && /^[A-Z]{3}\/[A-Z]{3}/i.test(s.replace(/\s+OTC$/i, '')))
      .sort();
    if (!symbols.length) return;
    const sym = symbols[this.scanIndex % symbols.length]!;
    this.scanIndex = (this.scanIndex + 1) % symbols.length;
    this.requestSymbol(sym);
  }

  requestSymbol(displaySymbol: string): void {
    if (!displaySymbol || !this.socket?.connected || !this.connected) return;
    if (this.lastFocusSymbol === displaySymbol) return;
    const poAsset =
      this.poAssetBySymbol.get(displaySymbol) ?? displaySymbolToPoAsset(displaySymbol);
    if (!poAsset) return;
    this.lastFocusSymbol = displaySymbol;
    this.socket.emit('changeSymbol', { asset: poAsset, period: 30 });
    this.activeSymbol = displaySymbol;
    this.status(`changeSymbol → ${displaySymbol}`);
  }

  assetsForBridge(): BridgeAssetInput[] {
    const active = this.activeSymbol;
    return Array.from(this.assets.values())
      .filter((a) => /\sOTC$/i.test(a.symbol) && /^[A-Z]{3}\/[A-Z]{3}/i.test(a.symbol.replace(/\s+OTC$/i, '')))
      .map((a) => {
        const lkp = a.lastKnownPrice ?? a.price;
        const base = { ...a, ...(lkp != null ? { lastKnownPrice: lkp, price: lkp } : {}) };
        if (active && a.symbol === active && a.price != null) {
          return { ...base, price: a.price, live: true };
        }
        const { live: _l, ...rest } = base;
        return rest;
      });
  }

  private currentHost(): string {
    return this.hostList[this.hostIndex % this.hostList.length] ?? this.hostList[0]!;
  }

  private connect(): void {
    if (this.stopped) return;
    if (!this.authPayload) {
      this.status('Bad PO auth — refresh from F12 Demo');
      return;
    }

    const host = this.currentHost();
    this.status(`Connecting ${host}…`);
    this.socket?.disconnect();

    this.socket = io(host, {
      path: '/socket.io/',
      transports: ['websocket'],
      reconnection: !this.stopped,
      reconnectionAttempts: 12,
      reconnectionDelay: 2000,
      timeout: 20000,
      extraHeaders: {
        Origin: 'https://m.pocketoption.com',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    this.socket.on('connect', () => {
      this.status('Sending auth…');
      this.socket!.emit('auth', this.authPayload!);
    });

    this.socket.on('successauth', () => this.onAuthed());
    this.socket.on('successAuth', () => this.onAuthed());

    this.socket.on('updateAssets', (data: unknown) => this.applyUpdateAssets(data));
    this.socket.on('updateStream', (data: unknown) => this.applyUpdateStream(data));

    this.socket.on('changeSymbol', (data: unknown) => {
      if (data && typeof data === 'object' && 'asset' in data) {
        this.activeSymbol = poSymbolToDisplay(String((data as { asset: string }).asset));
      }
    });

    this.socket.onAny((event: string, ...args: unknown[]) => {
      this.noteEvent(event);
      if (event.toLowerCase().includes('asset') && event !== 'updateAssets') {
        const data = args[0];
        if (data) this.applyUpdateAssets(data);
      }
    });

    this.socket.on('connect_error', (err: Error) => {
      this.connected = false;
      if (this.hostList.length > 1) {
        this.hostIndex = (this.hostIndex + 1) % this.hostList.length;
        this.status(`Connect error → ${this.currentHost()}: ${err.message}`);
      } else {
        this.status(`Connect error: ${err.message}`);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      this.connected = false;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.status(`Disconnected (${reason})`);
      if (!this.stopped && reason === 'io server disconnect') {
        this.hostIndex = (this.hostIndex + 1) % this.hostList.length;
        setTimeout(() => this.connect(), 2500);
      }
    });
  }

  private onAuthed(): void {
    this.connected = true;
    this.bootstrapAfterAuth();
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      this.socket?.emit('ps');
    }, 60_000);
    setTimeout(() => this.retryBootstrapIfEmpty(), 5000);
  }

  /** PO sometimes sends updateAssets late — re-bootstrap once, never fake catalog. */
  private retryBootstrapIfEmpty(): void {
    if (this.assets.size > 0 || !this.connected) return;
    this.bootstrapAfterAuth();
    this.status('Waiting for PO updateAssets (no fake prices)');
  }

  private bootstrapAfterAuth(): void {
    const s = this.socket;
    if (!s?.connected) return;
    const asset = 'EURUSD_otc';
    s.emit('favorite/load');
    s.emit('indicator/load');
    s.emit('price-alert/load');
    s.emit('subscribeSymbol', asset);
    s.emit('changeSymbol', { asset, period: 30 });
    s.emit('subfor', asset);
    this.activeSymbol = 'EUR/USD OTC';
    this.status('Authenticated + PO bootstrap');
  }

  private noteEvent(event: string): void {
    if (event === 'ping' || event === 'pong') return;
    this.recentEvents.push(event);
    if (this.recentEvents.length > 8) this.recentEvents.shift();
  }

  private applyUpdateAssets(data: unknown): void {
    const rows = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { assets?: unknown[] }).assets)
        ? (data as { assets: unknown[] }).assets
        : null;
    if (!rows?.length) return;

    const parsed = parseUpdateAssetsPayload(rows);
    const now = Date.now();
    for (const a of parsed) {
      const prev = this.assets.get(a.symbol);
      if (a.poAsset) this.poAssetBySymbol.set(a.symbol, a.poAsset);
      const lkp = a.lastKnownPrice ?? a.price ?? prev?.lastKnownPrice ?? prev?.price;
      this.assets.set(a.symbol, {
        ...prev,
        ...a,
        lastKnownPrice: lkp,
        price: a.price ?? lkp ?? prev?.price,
        timestamp: now,
      });
    }
    if (parsed.length) {
      this.status(`updateAssets: ${parsed.length} pairs (PO live)`);
    }
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
    } else {
      this.assets.set(sym, {
        symbol: sym,
        poAsset: displaySymbolToPoAsset(sym),
        payout: 85,
        isOTC: /\sOTC$/i.test(sym),
        price: tick.price,
        lastKnownPrice: tick.price,
        timestamp: Date.now(),
        live: true,
      });
    }
  }

  private status(msg: string): void {
    const ev = this.recentEvents.slice(-3).join(',');
    this.lastMessage = ev ? `${msg} [${ev}]` : msg;
    this.cfg.onStatus?.(this.lastMessage);
  }
}
