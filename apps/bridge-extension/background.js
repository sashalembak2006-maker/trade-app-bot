/* eslint-disable */
const DEFAULTS = {
  backendUrl: 'http://127.0.0.1:3001',
  secret: 'dev-secret',
};

const frameData = new Map();
let flushTimer = null;
let postInFlight = false;
let pendingPost = null;
let lastPostedKey = '';
let lastPostedAt = 0;
const MIN_POST_MS = 700;

async function getConfig() {
  const cfg = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...cfg };
}

function priceRangeForSymbol(symbol) {
  const s = (symbol || '').toUpperCase();
  if (/BTC|ETH/.test(s)) return { min: 50, max: 500_000 };
  if (/GOLD|XAU|SILVER|XAG/.test(s)) return { min: 10, max: 50_000 };
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

function mergeFrameAssets() {
  const now = Date.now();
  const entries = [];
  for (const [key, entry] of frameData) {
    if (now - entry.at > 5000) {
      frameData.delete(key);
      continue;
    }
    entries.push({ key, entry });
  }

  // Prefer trading-terminal frames that carry a live price.
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
  let hosts = new Set();
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

  // Keep live prices for every symbol that PO updateStream reported (not only active).

  return {
    assets: Array.from(merged.values()),
    frameCount,
    host: Array.from(hosts).join(', ') || '',
    activeSymbol,
  };
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushAndPost, 400);
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

async function fetchBackend(path, init) {
  const cfg = await getConfig();
  const urls = backendUrls(cfg.backendUrl);
  let lastError = 'Failed to fetch';
  for (const url of urls) {
    try {
      const res = await fetch(`${url}${path}`, {
        ...init,
        signal: AbortSignal.timeout?.(8000) ?? undefined,
      });
      return { res, url };
    } catch (e) {
      lastError = e.message || lastError;
    }
  }
  throw new Error(lastError);
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
  });

  if (assets.length > 0) {
    await postAssets(assets, activeSymbol);
  } else {
    await pingBackend();
  }
}

/** Keep popup honest: backend up vs no scrape data. */
async function pingBackend() {
  try {
    const { res } = await fetchBackend('/api/health');
    await chrome.storage.local.set({
      backendReachable: res.ok,
      backendReachableAt: Date.now(),
      lastStatus: res.ok ? 'Backend OK — чекаємо дані з PO' : `HTTP ${res.status}`,
      lastStatusAt: Date.now(),
    });
  } catch (e) {
    await chrome.storage.local.set({
      backendReachable: false,
      backendReachableAt: Date.now(),
      lastStatus: `${e.message} — запустіть ЗАПУСК.bat`,
      lastStatusAt: Date.now(),
    });
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

    const payloadKey = JSON.stringify(
      assets.map((a) => [a.symbol, a.price ?? null, a.payout]),
    );
    const now = Date.now();
    if (payloadKey === lastPostedKey && now - lastPostedAt < MIN_POST_MS) return;

    const cfg = await getConfig();
    if (!cfg.secret) {
      await chrome.storage.local.set({
        connected: false,
        lastStatus: 'Bridge Secret порожній — введіть dev-secret',
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
          'x-bridge-secret': cfg.secret,
        },
        body: JSON.stringify({
          source: 'browser-extension',
          activeSymbol: activeSymbol ?? null,
          assets,
        }),
      });
      const body = await res.json().catch(() => ({}));
      const ok = res.ok;
      await chrome.storage.local.set({
        connected: ok,
        backendReachable: true,
        backendReachableAt: Date.now(),
        lastStatus: ok
          ? `OK (${body.accepted ?? 0} assets)`
          : res.status === 401
            ? 'HTTP 401: невірний Secret — має бути dev-secret'
            : `HTTP ${res.status}: ${body.error ?? 'error'}`,
        lastStatusAt: Date.now(),
      });
      if (ok) {
        lastPostedKey = payloadKey;
        lastPostedAt = Date.now();
      }
    } catch (e) {
      await chrome.storage.local.set({
        connected: false,
        backendReachable: false,
        backendReachableAt: Date.now(),
        lastStatus: `${e.message} — запустіть ЗАПУСК.bat (вікно API має бути відкритим)`,
        lastStatusAt: Date.now(),
      });
    }
  } finally {
    postInFlight = false;
    if (pendingPost) {
      const next = pendingPost;
      pendingPost = null;
      setTimeout(() => postAssets(next.assets, next.activeSymbol), MIN_POST_MS);
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
    return false;
  }

  if (msg.type === 'test-backend') {
    (async () => {
      try {
        const { res, url } = await fetchBackend('/api/health');
        const body = await res.json().catch(() => ({}));
        await chrome.storage.local.set({
          backendReachable: res.ok,
          backendReachableAt: Date.now(),
          lastStatus: res.ok ? `Backend OK ✓ (${url})` : `HTTP ${res.status}`,
          lastStatusAt: Date.now(),
        });
        sendResponse({ ok: res.ok, status: res.status, body, url });
      } catch (e) {
        await chrome.storage.local.set({
          backendReachable: false,
          backendReachableAt: Date.now(),
          lastStatus: `${e.message} — подвійний клік ЗАПУСК.bat у папці проєкту`,
          lastStatusAt: Date.now(),
        });
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(DEFAULTS);
  const merged = { ...DEFAULTS, ...existing };
  if (!existing.secret) merged.secret = DEFAULTS.secret;
  if (!existing.backendUrl || existing.backendUrl.includes('localhost:3001')) {
    merged.backendUrl = DEFAULTS.backendUrl;
  }
  await chrome.storage.local.set(merged);
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

/** Poll backend focus requests — tells content script to click the asset on PO. */
async function pollFocus() {
  try {
    const cfg = await getConfig();
    const base = cfg.backendUrl.replace(/\/$/, '');
    const urls = [base];
    if (base.includes('localhost')) urls.push(base.replace('localhost', '127.0.0.1'));
    let data = null;
    for (const url of urls) {
      try {
        const res = await fetch(`${url}/api/bridge/focus`);
        if (res.ok) {
          data = await res.json();
          break;
        }
      } catch { /* try next */ }
    }
    if (!data?.symbol) return;
    const tabs = await chrome.tabs.query({ url: PO_TAB_URLS });
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.sendMessage(tab.id, { type: 'bridge-focus', symbol: data.symbol }).catch(() => {});
      }
    }
  } catch { /* ignore */ }
}

setInterval(pollFocus, 500);
