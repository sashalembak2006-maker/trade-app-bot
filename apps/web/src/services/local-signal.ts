import { SignalEngine } from '../../../../packages/shared/src/signal/engine';
import type { Asset, SignalResult } from '../types';
import { api } from './api';
import { useAppStore } from '../store/useAppStore';
import { isDriftAcceptable, maxAcceptableDrift, priceDrift } from '../utils/signal-price-validation';

const engine = new SignalEngine();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Never let a hung fetch block the signal UI past maxMs. */
async function withHardTimeout<T>(promise: Promise<T>, maxMs: number): Promise<T | null> {
  return Promise.race([promise, sleep(maxMs).then(() => null)]);
}

function collectorOnline(): boolean {
  const ms = useAppStore.getState().marketStatus;
  return ms?.collectorOnline === true && ms?.collectorWsConnected === true;
}

export function timeoutFailure(symbol: string): PriceVerifyFailure {
  return {
    ok: false,
    code: 'TIMEOUT',
    storePrice: readPoPriceFromStore(symbol),
    apiPrice: null,
  };
}

export type VerifiedPoPrice = {
  price: number;
  live: boolean;
  source: 'live_tick' | 'bridge_api';
  storePrice: number | null;
  at: number;
};

export type PriceVerifyFailure = {
  ok: false;
  code: 'NO_PRICE' | 'NOT_LIVE' | 'DRIFT' | 'TIMEOUT';
  storePrice: number | null;
  apiPrice: number | null;
  drift?: number;
  maxDrift?: number;
};

export type PriceVerifyResult = { ok: true; data: VerifiedPoPrice } | PriceVerifyFailure;

/** PO quote from store or selected asset row — sync, no network. */
export function resolveEntryPrice(symbol: string, asset?: Asset | null): number | null {
  const fromStore = readPoPriceFromStore(symbol);
  if (fromStore != null) return fromStore;
  if (asset?.price != null && asset.price > 0) return asset.price;
  if (asset?.lastKnownPrice != null && asset.lastKnownPrice > 0) return asset.lastKnownPrice;
  return null;
}

/** Background refresh only — never block signal UI. */
export function refreshPoPriceBackground(symbol: string): void {
  void fetchVerifiedPoPrice(symbol, 1200).catch(() => {});
}

/** Instant PO quote from assets list (no network). */
export function readPoPriceFromStore(symbol: string): number | null {
  const row = useAppStore.getState().assets.find((a) => a.symbol === symbol);
  const p = row?.price ?? row?.lastKnownPrice ?? null;
  return p != null && p > 0 ? p : null;
}

/** Strict live PO tick — only when stream is live. */
export async function fetchLivePoTick(symbol: string, maxWaitMs = 1200): Promise<number | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(0, deadline - Date.now());
    if (remaining <= 0) break;
    try {
      const ticks = await api.getTicks(symbol, 0, { timeoutMs: Math.min(500, remaining) });
      if (ticks.live && ticks.latest != null && ticks.latest > 0) return ticks.latest;
      if (ticks.display != null && ticks.display > 0) return ticks.display;
    } catch {
      /* retry until deadline */
    }
    const left = deadline - Date.now();
    if (left <= 0) break;
    await sleep(Math.min(40, left));
  }
  return null;
}

/** Verified PO price for entry/exit — collector focus + live tick preferred. */
async function fetchVerifiedPoPriceInner(
  symbol: string,
  maxWaitMs: number,
): Promise<PriceVerifyResult> {
  const started = Date.now();
  const storePrice = readPoPriceFromStore(symbol);
  const vps = collectorOnline();

  void api.requestFocus(symbol, 180_000).catch(() => {});
  await sleep(vps ? 200 : 350);

  const deadline = started + maxWaitMs;
  let apiPrice: number | null = null;
  let source: VerifiedPoPrice['source'] = 'live_tick';
  let live = false;

  while (Date.now() < deadline && apiPrice == null) {
    const remaining = Math.max(0, deadline - Date.now());
    if (remaining <= 0) break;
    const ticks = await withHardTimeout(
      api.getTicks(symbol, 0, { timeoutMs: Math.min(500, remaining) }),
      Math.min(550, remaining),
    );
    if (ticks?.live && ticks.latest != null && ticks.latest > 0) {
      apiPrice = ticks.latest;
      live = true;
      source = 'live_tick';
      break;
    }
    const catalog = ticks?.display ?? ticks?.catalog ?? ticks?.latest;
    if (catalog != null && catalog > 0 && (vps || Date.now() - started >= 400)) {
      apiPrice = catalog;
      live = Boolean(ticks?.live);
      source = ticks?.live ? 'live_tick' : 'bridge_api';
      if (live) break;
    }
    await sleep(Math.min(35, remaining));
  }

  if (apiPrice == null) {
    const remaining = Math.max(0, deadline - Date.now());
    if (remaining > 0) {
      const waitMs = Math.min(vps ? 1800 : 900, remaining);
      const q = await withHardTimeout(
        api.getLivePrice(symbol, waitMs, {
          timeoutMs: Math.min(waitMs + 200, remaining + 100),
        }),
        remaining,
      );
      if (q?.price != null && q.price > 0) {
        apiPrice = q.price;
        live = q.live === true;
        source = q.live ? 'live_tick' : 'bridge_api';
      }
    }
  }

  if (apiPrice == null && storePrice != null) {
    apiPrice = storePrice;
    live = false;
    source = 'bridge_api';
  }

  if (apiPrice == null) {
    const entry = resolveEntryPrice(symbol);
    if (entry != null) {
      return {
        ok: true,
        data: {
          price: entry,
          live: false,
          source: 'bridge_api',
          storePrice,
          at: Date.now(),
        },
      };
    }
    return { ok: false, code: 'NO_PRICE', storePrice, apiPrice: null };
  }

  if (storePrice != null && !isDriftAcceptable(apiPrice, storePrice)) {
    const drift = priceDrift(storePrice, apiPrice);
    const maxDrift = maxAcceptableDrift(apiPrice);
    console.warn('[PRIME Signal] store/API drift — using API price', {
      symbol,
      storePrice,
      apiPrice,
      drift,
      maxDrift,
    });
  }

  return {
    ok: true,
    data: {
      price: apiPrice,
      live: live || source === 'live_tick',
      source,
      storePrice,
      at: Date.now(),
    },
  };
}

export async function fetchVerifiedPoPrice(
  symbol: string,
  maxWaitMs = 3500,
): Promise<PriceVerifyResult> {
  const result = await withHardTimeout(fetchVerifiedPoPriceInner(symbol, maxWaitMs), maxWaitMs + 150);
  return result ?? timeoutFailure(symbol);
}

/** Entry / exit fallback — prefer verified live path. */
export async function fetchFreshPoPrice(symbol: string, maxMs = 2000): Promise<number | null> {
  const verified = await fetchVerifiedPoPrice(symbol, maxMs);
  if (verified.ok) return verified.data.price;
  return null;
}

export function generateLocalSignal(input: {
  asset: Asset;
  timeframe: string;
  entryPrice: number;
}): SignalResult {
  return engine.generate({
    assetId: input.asset.id,
    symbol: input.asset.symbol,
    timeframe: input.timeframe,
    price: input.entryPrice,
    payout: input.asset.payout,
    isOTC: input.asset.isOTC,
  }) as SignalResult;
}

export function recordSignalBackground(result: SignalResult): void {
  void api
    .recordSignal({
      id: result.id,
      symbol: result.symbol,
      assetId: result.assetId,
      direction: result.direction,
      timeframe: result.timeframe,
      entryPrice: result.entryPrice,
      confidence: result.confidence,
      payout: result.payout,
      market: result.market,
      expiresAt: result.expiresAt,
    })
    .catch(() => {});
}

/** Countdown — live stream when network=true. */
export async function readPoLivePrice(symbol: string, opts?: { network?: boolean }): Promise<number | null> {
  if (!opts?.network) return readPoPriceFromStore(symbol);
  const live = await fetchLivePoTick(symbol, 800);
  return live ?? readPoPriceFromStore(symbol);
}
