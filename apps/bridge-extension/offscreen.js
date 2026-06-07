/* eslint-disable */
function attachPort(port) {
  port.onMessage.addListener(async (msg) => {
    if (msg?.type !== 'fetch' || !msg.id) return;

    try {
      const res = await fetch(msg.url, {
        method: msg.method || 'GET',
        headers: msg.headers || {},
        body: msg.body,
        credentials: 'omit',
      });
      const text = await res.text();
      port.postMessage({
        id: msg.id,
        ok: true,
        status: res.status,
        statusText: res.statusText,
        text,
      });
    } catch (e) {
      port.postMessage({
        id: msg.id,
        ok: false,
        error: e?.message || 'Failed to fetch',
      });
    }
  });

  port.onDisconnect.addListener(() => {
    setTimeout(connect, 400);
  });
}

function connect() {
  try {
    attachPort(chrome.runtime.connect({ name: 'offscreen-bridge' }));
  } catch {
    setTimeout(connect, 400);
  }
}

connect();
