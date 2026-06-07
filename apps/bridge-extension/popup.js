/* eslint-disable */
const DEFAULTS = { backendUrl: 'https://prime-trade-production.up.railway.app', secret: '9a26f2c606a207f3d98a74e99ab588c0957ae68ffeb5' };

const $ = (id) => document.getElementById(id);

function baseUrl() {
  return BridgeHttp.normalizeBackendUrl($('backendUrl').value);
}

function secret() {
  return ($('secret').value.trim() || DEFAULTS.secret);
}

async function load() {
  const cfg = await chrome.storage.local.get(DEFAULTS);
  $('backendUrl').value = BridgeHttp.normalizeBackendUrl(cfg.backendUrl ?? DEFAULTS.backendUrl);
  $('secret').value = cfg.secret ?? DEFAULTS.secret;
  renderLive();
}

function isRecent(ts, ms) {
  return ts && Date.now() - ts < ms;
}

async function renderLive() {
  const data = await chrome.storage.local.get([
    'lastStatus', 'lastStatusAt', 'lastHeartbeatAt',
    'lastPostSuccessAt', 'lastPostError',
    'lastAsset', 'lastPrice', 'lastPayout', 'lastHost', 'lastPath',
    'lastFrame', 'lastScrapeCount',
    'poAuthFrame', 'poAuthCapturedAt',
  ]);

  const heartbeatOk = isRecent(data.lastHeartbeatAt, 15000);
  const scrapeOk = (data.lastScrapeCount ?? 0) >= 1;
  const postOk =
    isRecent(data.lastPostSuccessAt, BridgeHttp.POST_OK_WINDOW_MS ?? 25000) ||
    (isRecent(data.lastPostSuccessAt, 45000) && heartbeatOk && scrapeOk);

  const box = $('statusBox');
  let statusText = 'Status: Not connected';
  let hint = '';
  box.className = 'status bad';

  if (postOk && scrapeOk) {
    statusText = 'Status: Connected ✓';
    box.className = 'status ok';
    hint = data.lastStatus ?? 'POST OK — бот оновлюється';
    if (data.lastPostError) hint += ` (retry: ${data.lastPostError})`;
  } else if (heartbeatOk && scrapeOk && !postOk) {
    statusText = 'Status: Надсилаємо…';
    box.className = 'status warn';
    hint = data.lastPostError || data.lastStatus || 'Чекаємо POST на Railway…';
  } else if (heartbeatOk && !scrapeOk) {
    statusText = 'Status: Page OK, no data';
    box.className = 'status warn';
    hint = 'F5 на Pocket Option → відкрийте список активів';
  } else if (heartbeatOk) {
    statusText = 'Status: Backend offline';
    box.className = 'status bad';
    hint = data.lastStatus || 'Натисни «Перевірити backend»';
  } else {
    hint = 'Відкрий Pocket Option → F5 → Reload розширення (↻)';
    if (data.lastStatus) hint = `${data.lastStatus} — ${hint}`;
  }

  $('status').textContent = statusText;
  const path = data.lastPath ? ` ${data.lastPath}` : '';
  $('pageHost').textContent = data.lastHost ? `${data.lastHost}${path} (${data.lastFrame || '?'})` : '—';
  $('scrapeCount').textContent = heartbeatOk ? String(data.lastScrapeCount ?? 0) : '—';
  $('lastAsset').textContent = data.lastAsset ?? '—';
  $('lastPrice').textContent = data.lastPrice != null ? String(data.lastPrice) : '—';
  $('lastPayout').textContent = data.lastPayout != null ? data.lastPayout + '%' : '—';
  $('hint').textContent = hint;
  const authEl = $('authHint');
  if (authEl) {
    if (data.poAuthFrame && isRecent(data.poAuthCapturedAt, 7 * 24 * 3600 * 1000)) {
      authEl.textContent = `PO auth ✓ збережено ${new Date(data.poAuthCapturedAt).toLocaleString('uk-UA')}`;
    } else {
      authEl.textContent = 'PO auth: F12 → Network → WS → перше 42["auth",…] після входу';
    }
  }
}

$('test').addEventListener('click', async () => {
  const url = baseUrl();
  $('backendUrl').value = url;
  await chrome.storage.local.set({ backendUrl: url, secret: secret() });
  $('hint').textContent = 'Перевірка…';
  try {
    const resp = await BridgeHttp.testBackend(secret());
    if (resp.ok) {
      const merged = await BridgeHttp.getMergedFromBackground();
      if (merged?.assets?.length) {
        const full = await BridgeHttp.postBridgeUpdate(merged, 'browser-extension-test-full', 'test');
        await BridgeHttp.markPostResult(full, merged.assets.length);
      } else {
        await BridgeHttp.markPostResult({ ok: true, accepted: 1 }, 1);
      }
      $('hint').textContent = `Backend OK ✓ POST OK (${resp.url})`;
    } else {
      await BridgeHttp.markPostResult({ ok: false, error: resp.error }, 0);
      $('hint').textContent = `FAIL: ${resp.error}`;
    }
  } catch (e) {
    await BridgeHttp.markPostError(`${e.message} — test`);
    $('hint').textContent = `FAIL: ${e.message}`;
  }
  renderLive();
});

$('copyAuth').addEventListener('click', async () => {
  const bag = await chrome.storage.local.get({ poAuthFrame: '', poAuthCapturedAt: 0 });
  const frame = bag.poAuthFrame || '';
  if (!frame) {
    $('authHint').textContent = 'Auth ще не перехоплено — увійдіть у PO demo (F5), зачекайте 5 сек';
    return;
  }
  const envLine = `PO_AUTH_MESSAGE=${frame}`;
  try {
    await navigator.clipboard.writeText(envLine);
    $('authHint').textContent = 'PO_AUTH_MESSAGE скопійовано ✓ → Railway Variables або VPS collector';
  } catch {
    console.log(envLine);
    $('authHint').textContent = 'Див. console (clipboard blocked)';
  }
});

$('copyBinary').addEventListener('click', async () => {
  const bag = await chrome.storage.local.get({
    prime_bridge_binary_debug: [],
    prime_bridge_binary_debug_at: 0,
  });
  const rows = Array.isArray(bag.prime_bridge_binary_debug) ? bag.prime_bridge_binary_debug : [];
  if (!rows.length) {
    $('hint').textContent = 'Немає binary-кадрів. PO → F5 → перемикай пару.';
    return;
  }
  const json = JSON.stringify(rows, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    $('hint').textContent = `Binary debug ✓ (${rows.length} кадрів)`;
  } catch (e) {
    $('hint').textContent = 'Clipboard blocked';
    console.log(json);
  }
});

$('save').addEventListener('click', async () => {
  const url = baseUrl();
  const sec = secret();
  $('backendUrl').value = url;
  $('secret').value = sec;
  await chrome.storage.local.set({
    backendUrl: url,
    secret: sec,
    lastPostError: '',
    lastPostSuccessAt: 0,
  });
  $('status').textContent = 'Збережено ✓';
  $('hint').textContent = 'Натисни «Перевірити backend»';
  setTimeout(renderLive, 300);
});

setInterval(renderLive, 1000);
load();
