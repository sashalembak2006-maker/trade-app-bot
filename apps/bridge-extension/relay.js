/* eslint-disable */
/** Relay tab stays alive while PO is open — POST here (MV3 service worker sleeps). */
const RELAY_POST_MS = 250;

async function tick() {
  try {
    await BridgeHttp.runRelayTick('relay-tab');
  } catch {
    /* status in storage */
  }
  try {
    await chrome.runtime.sendMessage({ type: 'bridge-keepalive' });
  } catch {
    /* SW may restart */
  }
}

tick();
setInterval(tick, RELAY_POST_MS);
