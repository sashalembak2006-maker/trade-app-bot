import type { AssetCategory } from '../types/index.js';
import { POCKET_ASSETS } from './pocket-assets.js';

const VALID: AssetCategory[] = ['forex', 'forex_otc', 'crypto', 'stocks', 'commodities', 'indices'];

const CATALOG_CATEGORY = new Map<string, AssetCategory>();
for (const asset of POCKET_ASSETS) {
  CATALOG_CATEGORY.set(asset.symbol.toUpperCase(), asset.category);
  const base = asset.symbol.replace(/\s+OTC$/i, '').trim().toUpperCase();
  if (!CATALOG_CATEGORY.has(base)) CATALOG_CATEGORY.set(base, asset.category);
}

const CRYPTO_BASES = new Set([
  'BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'ADA', 'DOT', 'SOL', 'DOGE', 'BNB', 'AVAX', 'MATIC', 'LINK', 'UNI', 'SHIB',
]);

const STOCK_TICKERS = new Set([
  'AAPL', 'TSLA', 'GOOG', 'GOOGL', 'AMZN', 'MSFT', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC', 'BABA', 'COIN', 'BA', 'DIS',
]);

const COMMODITY_NAMES = new Set(['GOLD', 'SILVER', 'OIL', 'NAT.GAS', 'PLATINUM', 'PALLADIUM', 'BRENT', 'WTI']);

const INDEX_MARKERS = ['S&P 500', 'NASDAQ', 'DJI30', 'FTSE 100', 'DAX 40', 'NIKKEI', 'CAC 40', 'ASX 200'];

function stripOtc(symbol: string): string {
  return symbol.replace(/\s+OTC$/i, '').trim();
}

function isForexPair(base: string): boolean {
  return /^[A-Z]{3}\/[A-Z]{3}$/i.test(base);
}

function applyForexOtcSplit(category: AssetCategory, isOTC: boolean): AssetCategory {
  if (category === 'forex' || category === 'forex_otc') return isOTC ? 'forex_otc' : 'forex';
  return category;
}

/** Infer Mini App tab category from PO symbol (bridge sends no category field). */
export function resolveAssetCategory(symbol: string, isOTC = /otc/i.test(symbol)): AssetCategory {
  const key = symbol.trim().toUpperCase();
  const fromCatalog = CATALOG_CATEGORY.get(key) ?? CATALOG_CATEGORY.get(stripOtc(key).toUpperCase());
  if (fromCatalog) return applyForexOtcSplit(fromCatalog, isOTC);

  const base = stripOtc(key).toUpperCase();

  if (isForexPair(base)) return isOTC ? 'forex_otc' : 'forex';

  const slashBase = base.split('/')[0];
  if (CRYPTO_BASES.has(slashBase)) return 'crypto';

  if (STOCK_TICKERS.has(base)) return 'stocks';

  for (const marker of INDEX_MARKERS) {
    if (base.includes(marker.toUpperCase()) || key.includes(marker.toUpperCase())) return 'indices';
  }

  if (COMMODITY_NAMES.has(base)) return 'commodities';

  // PO company names: "American Express OTC", "Boeing Company OTC"
  if (/\s+OTC$/i.test(key) && !isForexPair(base)) return 'stocks';

  if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(base) && !isForexPair(base)) return 'stocks';

  return isOTC ? 'forex_otc' : 'forex';
}

export function normalizeAssetCategory(
  category: string | undefined,
  symbol: string,
  isOTC?: boolean,
): AssetCategory {
  const otc = isOTC ?? /otc/i.test(symbol);
  if (category && VALID.includes(category as AssetCategory)) {
    return applyForexOtcSplit(category as AssetCategory, otc);
  }
  return resolveAssetCategory(symbol, otc);
}
