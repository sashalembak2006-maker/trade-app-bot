/* eslint-disable */
/** Keep relay tab alive; POST runs in service worker (background.js). */
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'bridge-keepalive' }).catch(() => {});
}, 2000);
