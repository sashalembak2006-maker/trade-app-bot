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
  ]);

  const heartbeatOk = isRecent(data.lastHeartbeatAt, 12000);
  const postOk = isRecent(data.lastPostSuccessAt, 12000);
  const scrapeOk = (data.lastScrapeCount ?? 0) >= 3;

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
  $('backendUrl').value = url;
  await chrome.storage.local.set({ backendUrl: url, secret: secret() });
  $('status').textContent = 'Збережено ✓';
  setTimeout(renderLive, 300);
});

setInterval(renderLive, 1000);
load();
