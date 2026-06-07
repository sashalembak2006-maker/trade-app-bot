/* eslint-disable */
const DEFAULTS = { backendUrl: 'http://127.0.0.1:3001', secret: 'dev-secret' };

const $ = (id) => document.getElementById(id);

async function load() {
  const cfg = await chrome.storage.local.get(DEFAULTS);
  $('backendUrl').value = cfg.backendUrl ?? DEFAULTS.backendUrl;
  $('secret').value = cfg.secret ?? DEFAULTS.secret;
  renderLive();
}

function isRecent(ts, ms) {
  return ts && Date.now() - ts < ms;
}

async function renderLive() {
  const data = await chrome.storage.local.get([
    'connected', 'lastStatus', 'lastStatusAt', 'lastHeartbeatAt', 'backendReachable', 'backendReachableAt',
    'lastAsset', 'lastPrice', 'lastPayout', 'lastHost', 'lastPath', 'lastIsTradingPage',
    'lastFrame', 'lastScrapeCount',
  ]);

  const heartbeatOk = isRecent(data.lastHeartbeatAt, 12000);
  const backendOk = data.connected && isRecent(data.lastStatusAt, 15000);
  const backendUp =
    backendOk ||
    (data.backendReachable && isRecent(data.backendReachableAt, 15000)) ||
    (data.lastStatus && /^OK \(/i.test(data.lastStatus) && isRecent(data.lastStatusAt, 15000));

  const box = $('statusBox');
  let statusText = 'Status: Not connected';
  let hint = '';
  box.className = 'status bad';

  if (backendOk) {
    statusText = 'Status: Connected ✓';
    box.className = 'status ok';
    hint = data.lastStatus ?? '';
  } else if (backendUp && (data.lastScrapeCount ?? 0) === 0) {
    statusText = 'Status: Backend OK, no PO data';
    box.className = 'status warn';
    hint =
      'API працює, але пари не зчитані. F5 на сторінці PO → Console (F12): має бути «WebSocket hook installed». Відкрийте список активів зліва.';
  } else if (heartbeatOk && (data.lastScrapeCount ?? 0) === 0) {
    statusText = 'Status: Page OK, no data';
    box.className = 'status warn';
    hint = 'Натисніть F5 на Pocket Option. Перезавантажте розширення (↻) на chrome://extensions';
  } else if (heartbeatOk && !backendUp) {
    statusText = 'Status: Backend offline';
    box.className = 'status bad';
    hint =
      data.lastStatus && !/ЗАПУСК\.bat/i.test(data.lastStatus)
        ? `${data.lastStatus} — Перевірити backend`
        : 'Перевірте Backend URL + Secret → кнопка «Перевірити backend». Railway має бути online.';
  } else if (heartbeatOk) {
    statusText = 'Status: Scraping…';
    box.className = 'status warn';
    hint = data.lastStatus ?? '';
  } else {
    hint = 'Відкрийте Pocket Option, натисніть F5. Якщо не допомогло — перезавантажте розширення (↻).';
    if (data.lastStatus) hint = data.lastStatus + ' — ' + hint;
  }

  if (
    heartbeatOk &&
    data.lastIsTradingPage === false &&
    (data.lastScrapeCount ?? 0) < 10
  ) {
    statusText = 'Status: Не та сторінка';
    box.className = 'status warn';
    hint =
      'Відкрийте торговий термінал (Demo Trading). URL: …/demo-quick-high-low/ — потім F5.';
  } else if (backendOk && (data.lastScrapeCount ?? 0) >= 10) {
    statusText = 'Status: Connected ✓';
    box.className = 'status ok';
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
  const cfg = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set({
    backendUrl: $('backendUrl').value.trim() || DEFAULTS.backendUrl,
    secret: $('secret').value.trim() || DEFAULTS.secret,
  });
  chrome.runtime.sendMessage({ type: 'test-backend' }, (resp) => {
    if (chrome.runtime.lastError) {
      $('hint').textContent = chrome.runtime.lastError.message;
      return;
    }
    $('hint').textContent = resp?.ok
      ? `Backend OK ✓ (${cfg.backendUrl})`
      : `Backend FAIL: ${resp?.error ?? resp?.status}`;
    renderLive();
  });
});

$('copyBinary').addEventListener('click', async () => {
  const bag = await chrome.storage.local.get({
    prime_bridge_binary_debug: [],
    prime_bridge_binary_debug_at: 0,
  });
  const rows = Array.isArray(bag.prime_bridge_binary_debug) ? bag.prime_bridge_binary_debug : [];
  if (!rows.length) {
    $('hint').textContent =
      'Немає binary-кадрів. Відкрийте PO → F5 → перемикайте пару. Перевірте Console: [PRIME Bridge BIN]';
    return;
  }
  const json = JSON.stringify(rows, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    const age = bag.prime_bridge_binary_debug_at
      ? Math.round((Date.now() - bag.prime_bridge_binary_debug_at) / 1000)
      : '?';
    $('hint').textContent = `Binary debug скопійовано ✓ (${rows.length} кадрів, ${age}s тому)`;
  } catch (e) {
    $('hint').textContent = 'Clipboard заблоковано — відкрийте DevTools → __PRIME_BRIDGE_BINARY_DEBUG__';
    console.log(json);
  }
});

$('save').addEventListener('click', async () => {
  await chrome.storage.local.set({
    backendUrl: $('backendUrl').value.trim() || DEFAULTS.backendUrl,
    secret: $('secret').value.trim() || DEFAULTS.secret,
  });
  $('status').textContent = 'Збережено ✓';
  setTimeout(renderLive, 500);
});

setInterval(renderLive, 1000);
load();
