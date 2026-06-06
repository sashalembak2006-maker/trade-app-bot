let apiUrl = '';
let wsUrl = '';

function normalizeApiUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function apiToWs(url: string): string {
  return `${url.replace(/^http/, 'ws')}/ws`;
}

/** Load API/WS base URLs: VITE_* env → runtime-config.json (prod) → same-origin (dev). */
export async function loadRuntimeConfig(): Promise<void> {
  const envApi = import.meta.env.VITE_API_URL as string | undefined;
  if (envApi && envApi.length > 0) {
    apiUrl = normalizeApiUrl(envApi);
    const envWs = import.meta.env.VITE_WS_URL as string | undefined;
    wsUrl = envWs && envWs.length > 0 ? envWs : apiToWs(apiUrl);
    return;
  }

  if (import.meta.env.DEV) {
    apiUrl = '';
    wsUrl = 'ws://127.0.0.1:3001/ws';
    return;
  }

  try {
    const res = await fetch('/runtime-config.json', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = (await res.json()) as { apiUrl?: string; wsUrl?: string };
    if (cfg.apiUrl) {
      apiUrl = normalizeApiUrl(cfg.apiUrl);
      wsUrl = cfg.wsUrl && cfg.wsUrl.length > 0 ? cfg.wsUrl : apiToWs(apiUrl);
    }
  } catch {
    /* same-origin fallback in api.ts / websocket.ts */
  }
}

export function getRuntimeApiUrl(): string {
  return apiUrl;
}

export function getRuntimeWsUrl(): string {
  if (wsUrl) return wsUrl;
  if (apiUrl) return apiToWs(apiUrl);
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}
