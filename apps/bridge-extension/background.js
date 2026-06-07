/* eslint-disable */
const DEFAULTS = {
  backendUrl: 'https://prime-trade-production.up.railway.app',
  secret: '9a26f2c606a207f3d98a74e99ab588c0957ae68ffeb5',
};

const frameData = new Map();
/** Keeps ALL assets seen across PO tab rotations (PO WS sends one tab at a time). */
const catalogAssets = new Map();
const CATALOG_TTL_MS = 20 * 60 * 1000;
let flushTimer = null;
let postInFlight = false;
let pendingPost = null;
let lastPostedAt = 0;
let fetchFailStreak = 0;
let lastPostSuccessAt = 0;

/** Target ~250ms POST cadence — live prices without stale bridge heartbeat. */
const POST_INTERVAL_MS = 250;
const OFFSCREEN_URL = 'offscreen.html';
const pendingOffscreenFetches = new Map();
let offscreenPort = null;

async function waitForOffscreenPort(maxMs = 5000) {
  const start = Date.now();
  while (!offscreenPort && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!offscreenPort) throw new Error('Offscreen not ready');
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'offscreen-bridge') return;
  offscreenPort = port;
  port.onDisconnect.addListener(() => {
    offscreenPort = null;
    ensureOffscreen().catch(() => {});
  });
  port.onMessage.addListener((msg) => {
    const resolver = pendingOffscreenFetches.get(msg.id);
    if (!resolver) return;
    pendingOffscreenFetches.delete(msg.id);
    resolver(msg);
  });
});

function normalizeBackendUrl(raw) {
  let b = (raw || '').trim().replace(/\/$/, '');
  b = b.replace(/\/api\/health\/?$/i, '');
  b = b.replace(/\/api\/?$/i, '');
  return b || DEFAULTS.backendUrl;
}

async function getConfig() {
  const cfg = await chrome.storage.local.get(DEFAULTS);
  const merged = { ...DEFAULTS, ...cfg };
  merged.backendUrl = normalizeBackendUrl(merged.backendUrl);
  merged.secret = String(merged.secret || DEFAULTS.secret).trim();
  if (!merged.secret) merged.secret = DEFAULTS.secret;
  return merged;
}

async function ensureOffscreen() {
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
    });
    if (contexts.length > 0) return;
  }
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['WORKERS'],
      justification: 'Relay HTTPS fetch to PRIME TRADE BOT Railway backend',
    });
  } catch (e) {
    if (!/already exists|only a single offscreen/i.test(String(e?.message || e))) throw e;
  }
}

function makeResponse(status, text) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      try {
        return JSON.parse(text || '{}');
      } catch {
        return {};
      }
    },
    text: async () => text || '',
  };
}

async function fetchViaOffscreen(url, init = {}) {
  await ensureOffscreen();
  await waitForOffscreenPort();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingOffscreenFetches.delete(id);
      reject(new Error('Offscreen fetch timeout'));
    }, 15000);

    pendingOffscreenFetches.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.ok) resolve(makeResponse(msg.status, msg.text));
      else reject(new Error(msg.error || 'Failed to fetch'));
    });

    try {
      offscreenPort.postMessage({
        id,
        type: 'fetch',
        url,
        method: init.method || 'GET',
        headers: init.headers || {},
        body: init.body,
      });
    } catch (e) {
      clearTimeout(timer);
      pendingOffscreenFetches.delete(id);
      reject(e);
    }
  });
}

function priceRangeForSymbol(symbol) {
  const s = (symbol || '').toUpperCase();
  if (/BTC|ETH|LTC|XRP|SOL|ADA|DOT|DOGE|BNB|AVAX|MATIC|LINK|BCH/.test(s)) {
    return { min: 0.0001, max: 500_000 };
  }
  if (/GOLD|XAU|SILVER|XAG|OIL|NAT\.GAS|PLATINUM|PALLADIUM|BRENT|WTI/.test(s)) {
    return { min: 0.01, max: 50_000 };
  }
  if (/S&P|NASDAQ|DJI|DAX|FTSE|NIKKEI|CAC|ASX|INDEX/.test(s)) {
    return { min: 10, max: 100_000 };
  }
  const plain = s.replace(/\s+OTC$/, '').trim();
  if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(plain) && !/^[A-Z]{3}\/[A-Z]{3}$/.test(plain)) {
    return { min: 0.5, max: 100_000 };
  }
  if (/JPY/.test(s)) return { min: 40, max: 500 };
  if (/CLP|COP|IDR|VND|KRW|HUF|NGN|PYG|IRR|IQD|VEF/.test(s)) {
    return { min: 0.01, max: 100_000 };
  }
  if (/INR|TRY|RUB|CNH|BRL|MXN|LBP|PHP|THB|MYR|ZAR|ARS|PLN|CZK|DKK|SEK|NOK/.test(s)) {
    return { min: 0.01, max: 5_000 };
  }
  return { min: 0.000_01, max: 25 };
}

function isReasonablePrice(price, symbol) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price >= 1_000_000) {
    return false;
  }
  const { min, max } = priceRangeForSymbol(symbol);
  if (price < min || price > max) return false;
  if (price >= 20 && price <= 100 && max <= 25) return false;
  const frac = price.toFixed(10).replace(/0+$/, '').split('.')[1] || '';
  if (frac.length < 2) return false;
  if (price >= 50 && price <= 99 && frac.length <= 1) return false;
  return true;
}

function pickDisplayAsset(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  return assets.find((a) => isReasonablePrice(a.price, a.symbol)) || assets[0];
}

function ingestCatalogAssets(assets) {
  const now = Date.now();
  for (const a of assets || []) {
    if (!a?.symbol || typeof a.payout !== 'number') continue;
    const prev = catalogAssets.get(a.symbol);
    const next = {
      symbol: a.symbol,
      payout: a.payout,
      isOTC: a.isOTC ?? prev?.isOTC,
      category: a.category ?? prev?.category,
      timestamp: a.timestamp ?? prev?.timestamp ?? now,
      lastSeen: now,
    };
    if (isReasonablePrice(a.price, a.symbol)) next.price = a.price;
    else if (prev?.price != null) next.price = prev.price;
    catalogAssets.set(a.symbol, next);
  }
  for (const [sym, a] of catalogAssets) {
    if (now - (a.lastSeen ?? 0) > CATALOG_TTL_MS) catalogAssets.delete(sym);
  }
}

function mergeFrameAssets() {
  const now = Date.now();
  const entries = [];
  for (const [key, entry] of frameData) {
    if (now - entry.at > 8000) {
      frameData.delete(key);
      continue;
    }
    entries.push({ key, entry });
  }

  entries.sort((a, b) => {
    const aScore =
      (a.entry.isTradingPage ? 4 : 0) +
      (a.entry.activeSymbol ? 2 : 0) +
      ((a.entry.assets || []).some((x) => isReasonablePrice(x.price)) ? 8 : 0);
    const bScore =
      (b.entry.isTradingPage ? 4 : 0) +
      (b.entry.activeSymbol ? 2 : 0) +
      ((b.entry.assets || []).some((x) => isReasonablePrice(x.price)) ? 8 : 0);
    return bScore - aScore;
  });

  const merged = new Map();
  const hosts = new Set();
  let frameCount = 0;
  let activeSymbol = null;

  for (const { entry } of entries) {
    frameCount++;
    hosts.add(`${entry.host} (${entry.frame})`);
    if (entry.activeSymbol) activeSymbol = entry.activeSymbol;
    for (const a of entry.assets || []) {
      if (!a.symbol || typeof a.payout !== 'number') continue;
      const prev = merged.get(a.symbol);
      const next = {
        symbol: a.symbol,
        payout: a.payout,
        isOTC: a.isOTC ?? prev?.isOTC,
        category: a.category ?? prev?.category,
        timestamp: a.timestamp ?? prev?.timestamp ?? now,
      };
      if (isReasonablePrice(a.price, a.symbol)) {
        next.price = a.price;
      } else if (prev?.price != null) {
        next.price = prev.price;
      }
      merged.set(a.symbol, next);
    }
  }

  ingestCatalogAssets(Array.from(merged.values()));

  const catalog = Array.from(catalogAssets.values()).map((a) => {
    const live = merged.get(a.symbol);
    if (!live) return a;
    return {
      ...a,
      payout: live.payout ?? a.payout,
      price: live.price ?? a.price,
      category: live.category ?? a.category,
      isOTC: live.isOTC ?? a.isOTC,
      timestamp: live.timestamp ?? a.timestamp,
      lastSeen: Date.now(),
    };
  });

  return {
    assets: catalog.length ? catalog : Array.from(merged.values()),
    frameCount,
    host: Array.from(hosts).join(', ') || '',
    activeSymbol,
  };
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushAndPost, 50);
}

function backendUrls(base) {
  const b = base.replace(/\/$/, '');
  const urls = [];
  if (b.includes('127.0.0.1')) {
    urls.push(b, b.replace('127.0.0.1', 'localhost'));
  } else if (b.includes('localhost')) {
    urls.push(b.replace('localhost', '127.0.0.1'), b);
  } else {
    urls.push(b);
  }
  return [...new Set(urls)];
}

async function fetchBackend(path, init, retries = 3) {
  const cfg = await getConfig();
  const urls = backendUrls(cfg.backendUrl);
  let lastError = 'Failed to fetch';

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const url of urls) {
      try {
        const res = await fetchViaOffscreen(`${url}${path}`, init);
        return { res, url };
      } catch (e) {
        lastError = e.message || lastError;
        try {
          const res = await fetch(`${url}${path}`, init);
          return { res, url };
        } catch (e2) {
          lastError = e2.message || lastError;
        }
      }
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error(lastError);
}

async function markRecentSuccess(count, extra = {}) {
  const now = Date.now();
  fetchFailStreak = 0;
  lastPostSuccessAt = now;
  await chrome.storage.local.set({
    connected: true,
    backendReachable: true,
    backendReachableAt: now,
    lastPostSuccessAt: now,
    lastHeartbeatAt: now,
    lastStatus: `OK (${count} assets)`,
    lastStatusAt: now,
    ...extra,
  });
}

async function markFetchFailure(message) {
  fetchFailStreak++;
  const now = Date.now();
  await chrome.storage.local.set({
    connected: false,
    lastStatus: message,
    lastStatusAt: now,
  });
}

async function flushAndPost() {
  const { assets, frameCount, host, activeSymbol } = mergeFrameAssets();
  const now = Date.now();

  let lastPath = '';
  let onTradingPage = false;
  for (const [, entry] of frameData) {
    if (entry.pathname) lastPath = entry.pathname;
    if (entry.isTradingPage) onTradingPage = true;
  }
  await chrome.storage.local.set({
    lastHeartbeatAt: now,
    lastHost: host || 'waiting…',
    lastPath,
    lastIsTradingPage: onTradingPage,
    lastFrame: frameCount ? `${frameCount} frame(s)` : '0',
    lastScrapeCount: assets.length,
    lastMergedPayload: { assets, activeSymbol },
    lastMergedAt: now,
  });

  if (assets.length > 0) {
    const activeRow = activeSymbol ? assets.find((a) => a.symbol === activeSymbol) : null;
    const shown = activeRow?.price != null ? activeRow : pickDisplayAsset(assets);
    if (shown) {
      await chrome.storage.local.set({
        lastAsset: activeSymbol || shown.symbol,
        lastPrice: activeRow?.price ?? shown.price ?? null,
        lastPayout: (activeRow ?? shown).payout ?? null,
        lastOtc: !!shown.isOTC,
      });
    }
    ensureRelayTab().catch(() => {});
  }
}

async function pingBackend() {
  try {
    const { res } = await fetchBackend('/api/health');
    const now = Date.now();
    fetchFailStreak = 0;
    await chrome.storage.local.set({
      backendReachable: res.ok,
      backendReachableAt: now,
      lastStatus: res.ok ? 'Backend OK — чекаємо дані з PO' : `HTTP ${res.status}`,
      lastStatusAt: now,
    });
  } catch (e) {
    await markFetchFailure(e.message);
  }
}

function cleanAssets(assets) {
  return assets
    .filter((a) => a?.symbol && typeof a.payout === 'number' && a.payout >= 1 && a.payout <= 100)
    .map((a) => {
      const row = { ...a };
      if (row.price != null && !isReasonablePrice(row.price, row.symbol)) delete row.price;
      return row;
    });
}

async function postAssets(assets, activeSymbol) {
  if (postInFlight) {
    pendingPost = { assets, activeSymbol };
    return;
  }
  postInFlight = true;
  try {
    assets = cleanAssets(assets);
    if (assets.length === 0) return;

    const now = Date.now();
    if (now - lastPostedAt < POST_INTERVAL_MS) {
      if (lastPostedAt > 0 && now - lastPostedAt < 30_000) {
        await markRecentSuccess(assets.length);
      }
      return;
    }

    const cfg = await getConfig();
    if (!cfg.secret?.trim()) {
      await chrome.storage.local.set({
        connected: false,
        lastStatus: 'Bridge Secret порожній',
        lastStatusAt: Date.now(),
      });
      return;
    }

    const activeRow = activeSymbol ? assets.find((a) => a.symbol === activeSymbol) : null;
    const shown = activeRow?.price != null ? activeRow : pickDisplayAsset(assets);
    if (shown) {
      await chrome.storage.local.set({
        lastAsset: activeSymbol || shown.symbol,
        lastPrice: activeRow?.price ?? shown.price ?? null,
        lastPayout: (activeRow ?? shown).payout ?? null,
        lastOtc: !!shown.isOTC,
        lastScrapeCount: assets.length,
      });
    }

    try {
      const { res } = await fetchBackend('/api/bridge/assets/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': cfg.secret.trim(),
        },
        body: JSON.stringify({
          source: 'browser-extension',
          activeSymbol: activeSymbol ?? null,
          assets,
        }),
      });
      const body = await res.json().catch(() => ({}));
      const ok = res.ok;
      const accepted = body.accepted ?? assets.length;
      if (ok) {
        lastPostedAt = Date.now();
        await markRecentSuccess(accepted);
      } else {
        fetchFailStreak++;
        if (res.status === 401 && cfg.secret !== DEFAULTS.secret) {
          await chrome.storage.local.set({ secret: DEFAULTS.secret });
        }
        await chrome.storage.local.set({
          connected: false,
          backendReachable: true,
          backendReachableAt: Date.now(),
          lastPostError:
            res.status === 401
              ? 'HTTP 401: Secret ≠ Railway BRIDGE_SECRET'
              : `HTTP ${res.status}: ${body.error ?? 'error'}`,
          lastStatus:
            res.status === 401
              ? 'HTTP 401: Secret ≠ Railway BRIDGE_SECRET — натисни Зберегти'
              : `HTTP ${res.status}: ${body.error ?? 'error'}`,
          lastStatusAt: Date.now(),
        });
      }
    } catch (e) {
      await markFetchFailure(e.message);
    }
  } finally {
    postInFlight = false;
    if (pendingPost) {
      const next = pendingPost;
      pendingPost = null;
      setTimeout(() => postAssets(next.assets, next.activeSymbol), POST_INTERVAL_MS);
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) return false;

  if (msg.type === 'bridge-frame-data') {
    const key = `${sender.tab?.id ?? 'x'}:${sender.frameId ?? 0}`;
    frameData.set(key, {
      assets: msg.assets,
      host: msg.host,
      pathname: msg.pathname ?? '',
      isTradingPage: !!msg.isTradingPage,
      frame: msg.frame,
      source: msg.source || 'dom',
      activeSymbol: msg.activeSymbol ?? null,
      at: Date.now(),
    });
    scheduleFlush();
    ensureRelayTab().catch(() => {});
    return false;
  }

  if (msg.type === 'bridge-keepalive') {
    flushAndPost();
    return false;
  }

  if (msg.type === 'bridge-get-merged') {
    sendResponse(mergeFrameAssets());
    return true;
  }

  if (msg.type === 'bridge-post-merged') {
    (async () => {
      try {
        const merged = mergeFrameAssets();
        if (!merged.assets.length) {
          sendResponse({ ok: false, error: 'no assets' });
          return;
        }
        await postAssets(merged.assets, merged.activeSymbol);
        sendResponse({ ok: true, count: merged.assets.length });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  return false;
});

const PO_TAB_URLS = [
  '*://pocketoption.com/*',
  '*://*.pocketoption.com/*',
  '*://po.trade/*',
  '*://*.po.trade/*',
  '*://po.market/*',
  '*://*.po.market/*',
  '*://po.site/*',
  '*://*.po.site/*',
];

const RELAY_PAGE = 'relay.html';

function isPoTabUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'pocketoption.com' ||
      host.endsWith('.pocketoption.com') ||
      host === 'po.trade' ||
      host.endsWith('.po.trade') ||
      host === 'po.market' ||
      host.endsWith('.po.market') ||
      host === 'po.site' ||
      host.endsWith('.po.site')
    );
  } catch {
    return false;
  }
}

function relayTabUrl() {
  return chrome.runtime.getURL(RELAY_PAGE);
}

async function ensureRelayTab() {
  const url = relayTabUrl();
  const existing = await chrome.tabs.query({ url });
  if (existing.length > 0) return existing[0].id;
  const tab = await chrome.tabs.create({ url, active: false });
  return tab.id;
}

async function syncRelayWithPoTabs() {
  const poTabs = await chrome.tabs.query({ url: PO_TAB_URLS });
  if (poTabs.length > 0) {
    await ensureRelayTab();
    return;
  }
  const relayTabs = await chrome.tabs.query({ url: relayTabUrl() });
  for (const tab of relayTabs) {
    if (tab.id != null) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(DEFAULTS);
  const merged = { ...DEFAULTS, ...existing };
  if (!existing.secret) merged.secret = DEFAULTS.secret;
  merged.backendUrl = normalizeBackendUrl(merged.backendUrl);
  await chrome.storage.local.set(merged);
  syncRelayWithPoTabs().catch(() => {});
});

chrome.runtime.onStartup?.addListener?.(() => {
  syncRelayWithPoTabs().catch(() => {});
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !isPoTabUrl(tab.url)) return;
  syncRelayWithPoTabs().catch(() => {});
});

chrome.tabs.onRemoved.addListener(() => {
  syncRelayWithPoTabs().catch(() => {});
});

async function pollFocus() {
  try {
    const cfg = await getConfig();
    const base = cfg.backendUrl.replace(/\/$/, '');
    const res = await fetchViaOffscreen(`${base}/api/bridge/focus`).catch(() =>
      fetch(`${base}/api/bridge/focus`),
    );
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.symbol) return;
    const tabs = await chrome.tabs.query({ url: PO_TAB_URLS });
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.sendMessage(tab.id, { type: 'bridge-focus', symbol: data.symbol }).catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }
}

setInterval(pollFocus, 3000);
syncRelayWithPoTabs().catch(() => {});

if (chrome.alarms) {
  chrome.alarms.create('bridge-keepalive', { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'bridge-keepalive') {
      flushAndPost();
      syncRelayWithPoTabs().catch(() => {});
    }
  });
}
