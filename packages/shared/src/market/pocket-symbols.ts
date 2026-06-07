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

export function parseUpdateStreamPrice(data: unknown): number | null {
  const tick = parseUpdateStreamTick(data);
  return tick?.price ?? null;
}

/** Parse Pocket `updateStream` payload — price tick, optional symbol. */
export function parseUpdateStreamTick(data: unknown): { symbol?: string; price: number } | null {
  if (data == null) return null;

  if (typeof data === 'number' && Number.isFinite(data)) {
    return { price: data };
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
    if (price == null || !Number.isFinite(price)) return null;
    const sym = o.asset ?? o.symbol ?? o.name;
    return {
      price,
      ...(typeof sym === 'string' ? { symbol: poSymbolToDisplay(sym) } : {}),
    };
  }

  if (!Array.isArray(data)) return null;

  if (Array.isArray(data[0])) {
    const row = data[0];
    if (row.length >= 2) {
      const sym = typeof row[0] === 'string' ? poSymbolToDisplay(row[0]) : undefined;
      const price = typeof row[1] === 'number' ? row[1] : typeof row[2] === 'number' ? row[2] : null;
      if (price != null && Number.isFinite(price)) return { price, ...(sym ? { symbol: sym } : {}) };
    }
  }

  if (data.length >= 2) {
    if (typeof data[0] === 'string' && typeof data[1] === 'number') {
      return { symbol: poSymbolToDisplay(data[0]), price: data[1] };
    }
    if (typeof data[1] === 'number') return { price: data[1] };
    if (typeof data[0] === 'number' && typeof data[1] === 'number') return { price: data[1] };
  }

  return null;
}
