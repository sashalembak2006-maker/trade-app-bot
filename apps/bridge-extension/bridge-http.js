/* eslint-disable */
/** Shared Railway POST client — single lock, compact payload, debounced errors. */
const BridgeHttp = (() => {
  const DEFAULTS = { backendUrl: 'https://prime-trade-production.up.railway.app', secret: '9a26f2c606a207f3d98a74e99ab588c0957ae68ffeb5' };
  const TIMEOUT_MS = 5000;
  const MIN_POST_GAP_MS = 100;
  const LOCK_KEY = 'bridgePostLock';
  const SUCCESS_GRACE_MS = 45000;
  const POST_OK_WINDOW_MS = 25000;

  function normalizeBackendUrl(raw) {
    let b = (raw || '').trim().replace(/\/$/, '');
    b = b.replace(/\/api\/health\/?$/i, '');
    b = b.replace(/\/api\/?$/i, '');
    return b || DEFAULTS.backendUrl;
  }

  function trimAssets(assets) {
    if (!Array.isArray(assets)) return [];
    return assets
      .filter((a) => a?.symbol && typeof a.payout === 'number' && a.payout >= 1 && a.payout <= 100)
      .map((a) => {
        const row = { symbol: String(a.symbol).slice(0, 64), payout: a.payout };
        if (a.isOTC) row.isOTC = true;
        if (a.category) row.category = a.category;
        if (typeof a.price === 'number' && Number.isFinite(a.price) && a.price > 0) {
          row.price = a.price;
        }
        if (a.live === true) row.live = true;
        if (a.synthetic === true) row.synthetic = true;
        if (typeof a.timestamp === 'number' && Number.isFinite(a.timestamp)) {
          row.timestamp = a.timestamp;
        }
        return row;
      });
  }

  /** Smaller body — include every scraped price (PO ws cache). */
  function compactPayload(merged) {
    return {
      activeSymbol: merged?.activeSymbol?.trim() || null,
      assets: trimAssets(merged?.assets),
    };
  }

  function xhrRequest(url, init) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(init.method || 'GET', url, true);
      xhr.timeout = init.timeoutMs ?? TIMEOUT_MS;
      for (const [key, value] of Object.entries(init.headers || {})) {
        if (value != null) xhr.setRequestHeader(key, String(value));
      }
      xhr.onload = () => {
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, text: xhr.responseText || '' });
      };
      xhr.onerror = () => reject(new Error('Failed to fetch'));
      xhr.ontimeout = () => reject(new Error('Request timeout'));
      xhr.send(init.body ?? null);
    });
  }

  async function httpRequest(url, init) {
    let lastError = 'Failed to fetch';
    try {
      return await xhrRequest(url, { ...init, timeoutMs: TIMEOUT_MS });
    } catch (e) {
      lastError = e?.message || lastError;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, credentials: 'omit', signal: controller.signal });
      return { ok: res.ok, status: res.status, text: await res.text() };
    } catch (e) {
      if (e?.name === 'AbortError') throw new Error('Request timeout');
      throw new Error(lastError);
    } finally {
      clearTimeout(timer);
    }
  }

  async function getConfig() {
    const cfg = await chrome.storage.local.get(DEFAULTS);
    return {
      backendUrl: normalizeBackendUrl(cfg.backendUrl),
      secret: (cfg.secret || DEFAULTS.secret).trim(),
    };
  }

  async function acquirePostLock(owner) {
    const now = Date.now();
    const bag = await chrome.storage.local.get([LOCK_KEY, 'lastPostSuccessAt', 'lastPostAttemptAt']);
    let lock = bag[LOCK_KEY];
    if (lock && lock.until <= now) {
      await chrome.storage.local.remove(LOCK_KEY);
      lock = null;
    }
    if (lock && lock.until > now && lock.owner !== owner) return false;
    if (bag.lastPostAttemptAt && now - bag.lastPostAttemptAt < MIN_POST_GAP_MS) return false;
    await chrome.storage.local.set({
      [LOCK_KEY]: { owner, until: now + TIMEOUT_MS + 500 },
      lastPostAttemptAt: now,
    });
    return true;
  }

  async function releasePostLock(owner) {
    const bag = await chrome.storage.local.get([LOCK_KEY]);
    if (bag[LOCK_KEY]?.owner === owner) {
      await chrome.storage.local.remove(LOCK_KEY);
    }
  }

  async function markPostResult(result, mergedCount) {
    const now = Date.now();
    if (result.ok) {
      await chrome.storage.local.set({
        connected: true,
        backendReachable: true,
        backendReachableAt: now,
        lastPostSuccessAt: now,
        lastStatus: `OK (${result.accepted ?? mergedCount} assets)`,
        lastStatusAt: now,
        lastPostError: '',
      });
      return;
    }
    const bag = await chrome.storage.local.get(['lastPostSuccessAt']);
    if (bag.lastPostSuccessAt && now - bag.lastPostSuccessAt < SUCCESS_GRACE_MS) {
      await chrome.storage.local.set({
        lastPostError: result.error || `HTTP ${result.status}`,
        lastStatusAt: now,
      });
      return;
    }
    await chrome.storage.local.set({
      connected: false,
      lastStatus: result.error || `HTTP ${result.status}`,
      lastStatusAt: now,
      lastPostError: result.error || `HTTP ${result.status}`,
    });
  }

  async function markPostError(message) {
    const now = Date.now();
    const bag = await chrome.storage.local.get(['lastPostSuccessAt']);
    if (bag.lastPostSuccessAt && now - bag.lastPostSuccessAt < SUCCESS_GRACE_MS) {
      await chrome.storage.local.set({ lastPostError: message, lastStatusAt: now });
      return;
    }
    await chrome.storage.local.set({
      connected: false,
      lastStatus: message,
      lastStatusAt: now,
      lastPostError: message,
    });
  }

  async function postBridgeUpdate(merged, source = 'browser-extension', owner = 'poster') {
    const payload = compactPayload(merged);
    if (!payload.assets.length) return { ok: false, error: 'no assets' };

    const gotLock = await acquirePostLock(owner);
    if (!gotLock) return { ok: false, error: 'skipped (busy)', skipped: true };

    try {
      const cfg = await getConfig();
      if (!cfg.secret) return { ok: false, error: 'empty secret' };

      const url = `${cfg.backendUrl}/api/bridge/assets/update`;
      const res = await httpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': cfg.secret,
        },
        body: JSON.stringify({
          source,
          activeSymbol: payload.activeSymbol,
          assets: payload.assets,
        }),
      });

      let parsed = {};
      try {
        parsed = JSON.parse(res.text || '{}');
      } catch {
        parsed = {};
      }

      if (!res.ok && res.status === 401 && cfg.secret !== DEFAULTS.secret) {
        await chrome.storage.local.set({ secret: DEFAULTS.secret });
      }

      return {
        ok: res.ok,
        status: res.status,
        accepted: parsed.accepted ?? payload.assets.length,
        error: res.ok
          ? undefined
          : res.status === 401
            ? 'HTTP 401: Secret ≠ Railway BRIDGE_SECRET — Зберегти + Reload'
            : `HTTP ${res.status}`,
      };
    } finally {
      await releasePostLock(owner);
    }
  }

  async function testBackend(secretOverride) {
    const cfg = await getConfig();
    const secret = (secretOverride || cfg.secret).trim();
    const base = cfg.backendUrl;

    const health = await httpRequest(`${base}/api/health`, { method: 'GET' });
    if (!health.ok) return { ok: false, error: `Health HTTP ${health.status}`, url: base };

    const post = await httpRequest(`${base}/api/bridge/assets/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bridge-secret': secret },
      body: JSON.stringify({
        source: 'browser-extension-test',
        assets: [{ symbol: 'EUR/USD OTC', payout: 92, isOTC: true, category: 'forex_otc' }],
      }),
    });

    if (!post.ok) {
      return {
        ok: false,
        error: post.status === 401 ? 'HTTP 401: Secret ≠ Railway BRIDGE_SECRET' : `POST HTTP ${post.status}`,
        url: base,
      };
    }
    return { ok: true, url: base };
  }

  async function getMergedFromBackground() {
    try {
      const merged = await Promise.race([
        chrome.runtime.sendMessage({ type: 'bridge-get-merged' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 2500)),
      ]);
      if (merged?.assets?.length) return merged;
    } catch {
      /* storage fallback */
    }
    const bag = await chrome.storage.local.get(['lastMergedPayload', 'lastMergedAt']);
    if (bag.lastMergedPayload?.assets?.length && bag.lastMergedAt && Date.now() - bag.lastMergedAt < 15000) {
      return bag.lastMergedPayload;
    }
    return null;
  }

  async function runRelayTick(owner = 'relay') {
    const merged = await getMergedFromBackground();
    if (!merged?.assets?.length) return;

    try {
      const result = await postBridgeUpdate(merged, 'browser-extension-relay', owner);
      if (result.skipped) {
        const bag = await chrome.storage.local.get(['lastPostSuccessAt']);
        if (bag.lastPostSuccessAt && Date.now() - bag.lastPostSuccessAt < POST_OK_WINDOW_MS) return;
        return;
      }
      await markPostResult(result, merged.assets.length);
    } catch (e) {
      await markPostError(`${e.message} — ${owner}`);
    }
  }

  return {
    normalizeBackendUrl,
    postBridgeUpdate,
    testBackend,
    markPostResult,
    markPostError,
    getMergedFromBackground,
    runRelayTick,
    POST_OK_WINDOW_MS,
  };
})();
