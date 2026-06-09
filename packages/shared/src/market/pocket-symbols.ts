import type { BridgeAssetInput } from '../types/index.js';

/** Display symbol → Pocket internal asset id for changeSymbol / WS commands. */
export function displaySymbolToPoAsset(display: string): string {
  if (!display) return '';
  const isOtc = /\s+OTC$/i.test(display);
  let base = display.replace(/\s+OTC$/i, '').trim();
  if (/^[A-Z]{3}\/[A-Z]{3}$/i.test(base)) {
    return base.replace('/', '').toUpperCase() + (isOtc ? '_otc' : '');
  }
  return base.replace(/\s+/g, '_').replace(/\//g, '') + (isOtc ? '_otc' : '');
}

/** Pocket internal symbol → display symbol used by the Mini App. */
export function poSymbolToDisplay(sym: string): string {
  if (!sym) return '';
  let s = String(sym).replace(/^#/, '');
  const isOtc = /_otc$/i.test(s);
  s = s.replace(/_otc$/i, '');
  if (/^[A-Z]{6}$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}${isOtc ? ' OTC' : ''}`;
  if (/^[A-Z]{3}\/[A-Z]{3}$/i.test(s)) return s.toUpperCase() + (isOtc ? ' OTC' : '');
  return s.replace(/_/g, ' ') + (isOtc && !/otc/i.test(s) ? ' OTC' : '');
}

function rowCatalogPrice(row: unknown[], symbol: string, payout: number): number | null {
  for (let i = 0; i < row.length; i++) {
    if (i === 5) continue;
    const v = row[i];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    if (v === payout || (v >= 50 && v <= 99 && Math.abs(v - Math.round(v)) < 0.001)) continue;
    const frac = v.toFixed(10).replace(/0+$/, '').split('.')[1] || '';
    if (frac.length < 2) continue;
    const core = symbol.replace(/\s+OTC$/i, '').toUpperCase();
    if (/JPY/.test(core) && (v < 40 || v > 500)) continue;
    if (!/JPY/.test(core) && v > 25 && v < 50_000) {
      if (v >= 50 && v <= 99) continue;
    }
    return v;
  }
  return null;
}

/** Parse one Pocket Option `updateAssets` row (array format). */
export function parsePocketAssetRow(row: unknown): BridgeAssetInput | null {
  if (!Array.isArray(row) || row.length < 6) return null;
  const raw = row[1];
  const payout = row[5];
  if (typeof raw !== 'string' || typeof payout !== 'number' || payout < 1 || payout > 100) return null;
  const isOTC = row[14] === true || /_otc/i.test(raw);
  const symbol = poSymbolToDisplay(raw);
  if (!symbol) return null;
  const catalogPrice = rowCatalogPrice(row, symbol, payout);
  return {
    symbol,
    payout,
    isOTC,
    poAsset: raw,
    ...(catalogPrice != null ? { lastKnownPrice: catalogPrice } : {}),
    timestamp: Date.now(),
  };
}

export function parseUpdateAssetsPayload(data: unknown): BridgeAssetInput[] {
  if (!Array.isArray(data)) return [];
  const out: BridgeAssetInput[] = [];
  for (const row of data) {
    const a = parsePocketAssetRow(row);
    if (a) out.push(a);
  }
  return out;
}

/** Unix seconds/ms from PO updateStream — never a forex price. */
function isLikelyUnixTimestamp(n: number): boolean {
  return Number.isFinite(n) && n >= 1e8 && n <= 2.2e12;
}

function tickFromStreamTuple(
  tuple: unknown[],
  fallbackSymbol?: string,
): { symbol?: string; price: number } | null {
  if (!Array.isArray(tuple) || tuple.length < 2) return null;

  // PO binary JSON: ["EURJPY_otc", 1780789097.061, 189.811]
  if (typeof tuple[0] === 'string' && tuple.length >= 3 && typeof tuple[2] === 'number') {
    const price = tuple[2];
    if (!Number.isFinite(price) || isLikelyUnixTimestamp(price)) return null;
    const symbol = poSymbolToDisplay(tuple[0]) || fallbackSymbol;
    return { ...(symbol ? { symbol } : {}), price };
  }

  if (typeof tuple[0] === 'string' && typeof tuple[1] === 'number' && !isLikelyUnixTimestamp(tuple[1])) {
    const symbol = poSymbolToDisplay(tuple[0]) || fallbackSymbol;
    return { ...(symbol ? { symbol } : {}), price: tuple[1] };
  }

  if (typeof tuple[0] === 'number' && typeof tuple[1] === 'number') {
    if (isLikelyUnixTimestamp(tuple[0]) && !isLikelyUnixTimestamp(tuple[1])) {
      return { price: tuple[1], ...(fallbackSymbol ? { symbol: fallbackSymbol } : {}) };
    }
    if (!isLikelyUnixTimestamp(tuple[1])) {
      return { price: tuple[1], ...(fallbackSymbol ? { symbol: fallbackSymbol } : {}) };
    }
  }

  return null;
}

/** Parse one or many PO updateStream ticks from decoded binary JSON. */
export function parseUpdateStreamTicks(
  data: unknown,
  fallbackSymbol?: string,
): Array<{ symbol?: string; price: number }> {
  const out: Array<{ symbol?: string; price: number }> = [];
  if (data == null) return out;

  if (typeof data === 'number' && Number.isFinite(data) && !isLikelyUnixTimestamp(data)) {
    out.push({ price: data, ...(fallbackSymbol ? { symbol: fallbackSymbol } : {}) });
    return out;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const price =
      typeof o.price === 'number'
        ? o.price
        : typeof o.value === 'number'
          ? o.value
          : typeof o.close === 'number'
            ? o.close
            : null;
    if (price != null && Number.isFinite(price) && !isLikelyUnixTimestamp(price)) {
      const sym = o.asset ?? o.symbol ?? o.name;
      out.push({
        price,
        ...(typeof sym === 'string' ? { symbol: poSymbolToDisplay(sym) } : fallbackSymbol ? { symbol: fallbackSymbol } : {}),
      });
    }
    return out;
  }

  if (!Array.isArray(data)) return out;

  if (data.length >= 3 && typeof data[0] === 'string') {
    const single = tickFromStreamTuple(data, fallbackSymbol);
    if (single) out.push(single);
    return out;
  }

  for (const item of data) {
    if (!Array.isArray(item)) continue;
    const tick = tickFromStreamTuple(item, fallbackSymbol);
    if (tick) out.push(tick);
  }
  if (out.length) return out;

  if (data.length >= 2) {
    if (typeof data[0] === 'string' && typeof data[1] === 'number' && !isLikelyUnixTimestamp(data[1])) {
      out.push({ symbol: poSymbolToDisplay(data[0]), price: data[1] });
      return out;
    }
    if (typeof data[1] === 'number' && !isLikelyUnixTimestamp(data[1])) {
      out.push({ price: data[1], ...(fallbackSymbol ? { symbol: fallbackSymbol } : {}) });
    }
  }

  return out;
}

export function parseUpdateStreamPrice(data: unknown): number | null {
  const tick = parseUpdateStreamTick(data);
  return tick?.price ?? null;
}

/** Parse Pocket `updateStream` payload — price tick, optional symbol. */
export function parseUpdateStreamTick(
  data: unknown,
  fallbackSymbol?: string,
): { symbol?: string; price: number } | null {
  return parseUpdateStreamTicks(data, fallbackSymbol)[0] ?? null;
}
