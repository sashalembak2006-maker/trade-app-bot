import type { Asset, CalculatorResult, IndicatorInfo, LearningArticle, NewsItem, SignalResult, MarketAnalysisData } from '../types';
import { getRuntimeApiUrl } from './runtime-config';

function getApiBase(): string {
  const runtime = getRuntimeApiUrl();
  if (runtime) return runtime;
  // Empty = same-origin relative URLs (dev Vite proxy → API).
  return '';
}

let telegramId: string | null = null;
let telegramFirstName: string | null = null;
let telegramUsername: string | null = null;

export function setTelegramProfile(id: number, firstName: string, username?: string) {
  telegramId = String(id);
  telegramFirstName = firstName;
  telegramUsername = username ?? null;
}

export function getTelegramProfile() {
  return { telegramId, telegramFirstName, telegramUsername };
}

function headerValue(value: string): string {
  return /^[\x00-\xFF]*$/.test(value) ? value : encodeURIComponent(value);
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (telegramId) h['x-telegram-id'] = telegramId;
  if (telegramFirstName) h['x-telegram-first-name'] = headerValue(telegramFirstName);
  if (telegramUsername) h['x-telegram-username'] = headerValue(telegramUsername);
  return h;
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
}

const DEFAULT_TIMEOUT = 8000;

async function fetchJson<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...headers(), ...options?.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error ?? `API ${res.status}`), {
        code: err.code,
        status: res.status,
      }) as ApiError;
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw Object.assign(new Error('Час очікування вичерпано'), { code: 'TIMEOUT' }) as ApiError;
    }
    if (e instanceof TypeError) {
      throw Object.assign(new Error('Сервер недоступний'), { code: 'NETWORK' }) as ApiError;
    }
    throw e;
  } finally {
    options?.signal?.removeEventListener('abort', onExternalAbort);
    clearTimeout(timer);
  }
}

export interface UserProfile {
  id: number;
  telegramId: string;
  username?: string;
  firstName?: string;
  status: string;
  accessLevel: string;
  depositAmount: number;
  isVip: boolean;
  isInvited: boolean;
  isBanned: boolean;
  platformAccountId?: string;
  signalCount?: number;
}

export interface AccessStatus {
  status: string;
  accessLevel: string;
  isVip: boolean;
  isInvited: boolean;
  isBanned: boolean;
  hasAppAccess: boolean;
  hasVipAccess: boolean;
  hasLimitedAccess?: boolean;
  hasSignalAccess?: boolean;
}

export type MarketDataMode = 'mock' | 'live' | 'unconfigured';

export interface MarketDataStatus {
  mode: MarketDataMode;
  configured: boolean;
  source: string;
  stale?: boolean;
  lastUpdate?: number | null;
  assetCount?: number;
  activeMode?: 'mock' | 'platform' | 'unconfigured';
  bridgeConnected?: boolean;
  bridgeStale?: boolean;
  bridgeLastUpdate?: number | null;
}

export interface AssetsResponse {
  assets: Asset[];
  dataSource: MarketDataStatus;
}

export interface MarketDataRow {
  symbol: string;
  price: number | null;
  payout: number;
  source: string;
  lastUpdated: number | null;
  stale: boolean;
}

export const api = {
  health: () => fetchJson<{ status: string; market: MarketDataStatus }>('/api/health', { timeoutMs: 8000 }),
  getMarketStatus: () => fetchJson<MarketDataStatus>('/api/market/status', { timeoutMs: 8000 }),
  setMarketMode: (mode: 'mock' | 'platform' | 'unconfigured') =>
    fetchJson<MarketDataStatus>('/api/market/mode', { method: 'POST', body: JSON.stringify({ mode }), timeoutMs: 8000 }),
  getMe: () => fetchJson<UserProfile>('/api/me'),
  getAccessStatus: () => fetchJson<AccessStatus>('/api/access-status'),
  sync: () => fetchJson<UserProfile>('/api/sync', { method: 'POST', body: '{}' }),
  register: (platformAccountId: string) =>
    fetchJson<UserProfile>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ platformAccountId }),
    }),
  depositClaim: () =>
    fetchJson<UserProfile & { requestId?: string }>('/api/deposit-claim', {
      method: 'POST',
      body: '{}',
    }),
  getAssets: () => fetchJson<AssetsResponse>('/api/assets', { timeoutMs: 6000 }),
  requestFocus: (symbol: string, ttlMs?: number) =>
    fetchJson<{ ok: boolean; symbol: string }>('/api/focus', {
      method: 'POST',
      body: JSON.stringify({ symbol, ttlMs }),
    }),
  getLivePrice: (symbol: string, waitMs = 1200) =>
    fetchJson<{ symbol: string; price: number; live: boolean }>(
      `/api/assets/${encodeURIComponent(symbol)}/price?waitMs=${waitMs}`,
      { timeoutMs: 8000 },
    ),
  getTicks: (asset: string, since = 0) =>
    fetchJson<{
      asset: string;
      ticks: { price: number; ts: number; live?: boolean }[];
      latest: number | null;
      payout: number | null;
      live: boolean;
      catalog: number | null;
      display: number | null;
    }>(`/api/ticks?asset=${encodeURIComponent(asset)}&since=${since}`, { timeoutMs: 3000 }),
  getAssetAnalysis: (symbol: string) => fetchJson<MarketAnalysisData>(`/api/assets/${encodeURIComponent(symbol)}/analysis`),
  generateSignal: (body: Record<string, unknown>, opts?: { signal?: AbortSignal; timeoutMs?: number }) =>
    fetchJson<SignalResult>('/api/signals/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: opts?.timeoutMs ?? 45_000,
      signal: opts?.signal,
    }),
  getCoveragePrice: (symbol: string) =>
    fetchJson<{ symbol: string; entryPrice: number; source?: string; at: number }>(
      '/api/signals/coverage',
      { method: 'POST', body: JSON.stringify({ symbol }), timeoutMs: 12_000 },
    ),
  calculate: (body: Record<string, unknown>) =>
    fetchJson<CalculatorResult>('/api/calculator', { method: 'POST', body: JSON.stringify(body) }),
  getNews: () => fetchJson<NewsItem[]>('/api/news', { timeoutMs: 6000 }),
  getIndicators: () => fetchJson<IndicatorInfo[]>('/api/indicators', { timeoutMs: 6000 }),
  getLearning: () => fetchJson<LearningArticle[]>('/api/learning', { timeoutMs: 6000 }),
  vipRequest: () => fetchJson('/api/vip-request', { method: 'POST', body: '{}' }),
};

async function adminFetch(path: string, token: string, options?: RequestInit) {
  const r = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options?.headers },
  });
  if (r.status === 401) throw new Error('SESSION_EXPIRED');
  if (!r.ok) throw new Error(`Admin API error ${r.status}`);
  return r.json();
}

export const adminApi = {
  login: async (email: string, password: string) => {
    const r = await fetch(`${getApiBase()}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error('Невірний email або пароль');
    return r.json() as Promise<{ token: string }>;
  },
  getUsers: async (token: string, params?: string) => {
    const data = await adminFetch(`/api/admin/users?${params ?? ''}`, token);
    if (!Array.isArray(data)) throw new Error('Invalid users response');
    return data;
  },
  grantAccess: (token: string, id: number, level: 'invite' | 'registered' | 'basic' | 'vip' | 'revoke') =>
    adminFetch(`/api/admin/users/${id}/grant`, token, { method: 'PATCH', body: JSON.stringify({ level }) }),
  inviteUser: (token: string, id: number) =>
    adminFetch(`/api/admin/users/${id}/invite`, token, { method: 'PATCH' }),
  banUser: (token: string, id: number) =>
    adminFetch(`/api/admin/users/${id}/ban`, token, { method: 'PATCH' }),
  unbanUser: (token: string, id: number) =>
    adminFetch(`/api/admin/users/${id}/unban`, token, { method: 'PATCH' }),
  saveNote: (token: string, id: number, note: string) =>
    adminFetch(`/api/admin/users/${id}/note`, token, { method: 'PATCH', body: JSON.stringify({ note }) }),
  getAnalytics: (token: string) => adminFetch('/api/admin/analytics', token),
  getMarketData: (token: string) =>
    adminFetch('/api/admin/market-data', token) as Promise<{
      mode: string;
      status: MarketDataStatus;
      rows: MarketDataRow[];
      collector: CollectorStatus;
      stats: { total: number; pricedCount: number; staleCount: number };
    }>,
  clearBridgeData: (token: string) =>
    adminFetch('/api/admin/market-data/clear', token, { method: 'POST' }),
  getCollectorStatus: (token: string) =>
    adminFetch('/api/admin/collector/status', token) as Promise<CollectorStatus>,
  restartCollector: (token: string) =>
    adminFetch('/api/admin/collector/restart', token, { method: 'POST' }),
};

export interface CollectorStatus {
  online: boolean;
  lastHeartbeat: number | null;
  wsConnected: boolean;
  assetCount: number;
  pricedCount: number;
  activeSymbol: string | null;
  message: string;
  restartRequested: boolean;
  version: string;
}
