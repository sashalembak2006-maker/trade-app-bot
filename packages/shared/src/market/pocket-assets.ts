import type { Asset } from '../types/index.js';
import type { BridgeAssetInput } from '../types/index.js';
import { displaySymbolToPoAsset } from './pocket-symbols.js';
import { isForexOtcSymbol } from './price-validation.js';

type PairDef = {
  base: string;
  quote: string;
  flags: [string, string?];
  price: number;
  payout: number;
  favorite?: boolean;
};

const FOREX_MAJORS: PairDef[] = [
  { base: 'EUR', quote: 'USD', flags: ['🇪🇺', '🇺🇸'], price: 1.0842, payout: 92, favorite: true },
  { base: 'GBP', quote: 'USD', flags: ['🇬🇧', '🇺🇸'], price: 1.2718, payout: 90 },
  { base: 'USD', quote: 'JPY', flags: ['🇺🇸', '🇯🇵'], price: 156.42, payout: 88 },
  { base: 'USD', quote: 'CHF', flags: ['🇺🇸', '🇨🇭'], price: 0.9012, payout: 87 },
  { base: 'AUD', quote: 'USD', flags: ['🇦🇺', '🇺🇸'], price: 0.6584, payout: 89 },
  { base: 'NZD', quote: 'USD', flags: ['🇳🇿', '🇺🇸'], price: 0.6124, payout: 86 },
  { base: 'USD', quote: 'CAD', flags: ['🇺🇸', '🇨🇦'], price: 1.3621, payout: 88 },
];

const FOREX_CROSSES: PairDef[] = [
  { base: 'EUR', quote: 'GBP', flags: ['🇪🇺', '🇬🇧'], price: 0.8521, payout: 85 },
  { base: 'EUR', quote: 'JPY', flags: ['🇪🇺', '🇯🇵'], price: 169.58, payout: 84 },
  { base: 'GBP', quote: 'JPY', flags: ['🇬🇧', '🇯🇵'], price: 199.12, payout: 83 },
  { base: 'EUR', quote: 'CHF', flags: ['🇪🇺', '🇨🇭'], price: 0.9772, payout: 84 },
  { base: 'AUD', quote: 'JPY', flags: ['🇦🇺', '🇯🇵'], price: 102.94, payout: 82 },
  { base: 'CAD', quote: 'JPY', flags: ['🇨🇦', '🇯🇵'], price: 114.82, payout: 81 },
  { base: 'CHF', quote: 'JPY', flags: ['🇨🇭', '🇯🇵'], price: 173.54, payout: 80 },
  { base: 'EUR', quote: 'AUD', flags: ['🇪🇺', '🇦🇺'], price: 1.6472, payout: 82 },
  { base: 'GBP', quote: 'AUD', flags: ['🇬🇧', '🇦🇺'], price: 1.9318, payout: 81 },
  { base: 'AUD', quote: 'CAD', flags: ['🇦🇺', '🇨🇦'], price: 0.8912, payout: 83 },
  { base: 'AUD', quote: 'NZD', flags: ['🇦🇺', '🇳🇿'], price: 1.0915, payout: 84, favorite: true },
  { base: 'NZD', quote: 'JPY', flags: ['🇳🇿', '🇯🇵'], price: 95.72, payout: 80 },
  { base: 'EUR', quote: 'CAD', flags: ['🇪🇺', '🇨🇦'], price: 1.4768, payout: 82 },
  { base: 'GBP', quote: 'CAD', flags: ['🇬🇧', '🇨🇦'], price: 1.7324, payout: 81 },
  { base: 'EUR', quote: 'NZD', flags: ['🇪🇺', '🇳🇿'], price: 1.7724, payout: 80 },
  { base: 'GBP', quote: 'CHF', flags: ['🇬🇧', '🇨🇭'], price: 1.1472, payout: 81 },
  { base: 'AUD', quote: 'CHF', flags: ['🇦🇺', '🇨🇭'], price: 0.5932, payout: 79 },
  { base: 'CAD', quote: 'CHF', flags: ['🇨🇦', '🇨🇭'], price: 0.6618, payout: 79 },
  { base: 'NZD', quote: 'CAD', flags: ['🇳🇿', '🇨🇦'], price: 0.8156, payout: 78 },
  { base: 'GBP', quote: 'NZD', flags: ['🇬🇧', '🇳🇿'], price: 2.0784, payout: 78 },
  { base: 'EUR', quote: 'USD', flags: ['🇪🇺', '🇺🇸'], price: 1.0842, payout: 92 },
];

const FOREX_EXOTICS: PairDef[] = [
  { base: 'AED', quote: 'CNY', flags: ['🇦🇪', '🇨🇳'], price: 2.1196, payout: 76 },
  { base: 'BHD', quote: 'CNY', flags: ['🇧🇭', '🇨🇳'], price: 18.452, payout: 74 },
  { base: 'MAD', quote: 'USD', flags: ['🇲🇦', '🇺🇸'], price: 0.0982, payout: 72 },
  { base: 'SAR', quote: 'CNY', flags: ['🇸🇦', '🇨🇳'], price: 1.9324, payout: 73 },
  { base: 'ZAR', quote: 'USD', flags: ['🇿🇦', '🇺🇸'], price: 0.0542, payout: 71 },
  { base: 'TRY', quote: 'JPY', flags: ['🇹🇷', '🇯🇵'], price: 4.82, payout: 70 },
  { base: 'USD', quote: 'TRY', flags: ['🇺🇸', '🇹🇷'], price: 32.45, payout: 72 },
  { base: 'USD', quote: 'MXN', flags: ['🇺🇸', '🇲🇽'], price: 17.24, payout: 73 },
  { base: 'USD', quote: 'SGD', flags: ['🇺🇸', '🇸🇬'], price: 1.3421, payout: 74 },
  { base: 'USD', quote: 'HKD', flags: ['🇺🇸', '🇭🇰'], price: 7.8124, payout: 75 },
  { base: 'USD', quote: 'ZAR', flags: ['🇺🇸', '🇿🇦'], price: 18.45, payout: 71 },
  { base: 'USD', quote: 'INR', flags: ['🇺🇸', '🇮🇳'], price: 83.42, payout: 72 },
  { base: 'USD', quote: 'BRL', flags: ['🇺🇸', '🇧🇷'], price: 5.12, payout: 70 },
  { base: 'USD', quote: 'PLN', flags: ['🇺🇸', '🇵🇱'], price: 3.98, payout: 73 },
  { base: 'USD', quote: 'NOK', flags: ['🇺🇸', '🇳🇴'], price: 10.72, payout: 74 },
  { base: 'USD', quote: 'SEK', flags: ['🇺🇸', '🇸🇪'], price: 10.45, payout: 74 },
  { base: 'USD', quote: 'DKK', flags: ['🇺🇸', '🇩🇰'], price: 6.92, payout: 73 },
  { base: 'USD', quote: 'CNH', flags: ['🇺🇸', '🇨🇳'], price: 7.24, payout: 75 },
  { base: 'USD', quote: 'THB', flags: ['🇺🇸', '🇹🇭'], price: 36.12, payout: 71 },
  { base: 'USD', quote: 'KRW', flags: ['🇺🇸', '🇰🇷'], price: 1372.5, payout: 70 },
];

function makeForex(def: PairDef, otc: boolean): Asset {
  const pair = `${def.base}/${def.quote}`;
  const slug = `${def.base.toLowerCase()}-${def.quote.toLowerCase()}`;
  return {
    id: otc ? `${slug}-otc` : slug,
    symbol: otc ? `${pair} OTC` : pair,
    name: pair,
    category: otc ? 'forex_otc' : 'forex',
    isOTC: otc,
    price: def.price,
    payout: otc ? Math.max(60, def.payout - 8) : def.payout,
    change: Math.round((Math.random() - 0.5) * 40) / 100,
    flags: def.flags,
    favorite: def.favorite ?? false,
  };
}

function buildForexPairs(defs: PairDef[]): Asset[] {
  const assets: Asset[] = [];
  for (const def of defs) {
    assets.push(makeForex(def, false));
    assets.push(makeForex(def, true));
  }
  return assets;
}

const CRYPTO: PairDef[] = [
  { base: 'BTC', quote: 'USD', flags: ['₿', '🇺🇸'], price: 67245.8, payout: 88, favorite: true },
  { base: 'ETH', quote: 'USD', flags: ['Ξ', '🇺🇸'], price: 3542.6, payout: 86 },
  { base: 'LTC', quote: 'USD', flags: ['Ł', '🇺🇸'], price: 82.45, payout: 82 },
  { base: 'XRP', quote: 'USD', flags: ['✕', '🇺🇸'], price: 0.5242, payout: 80 },
  { base: 'BCH', quote: 'USD', flags: ['₿', '🇺🇸'], price: 412.8, payout: 79 },
  { base: 'ADA', quote: 'USD', flags: ['₳', '🇺🇸'], price: 0.4521, payout: 78 },
  { base: 'DOT', quote: 'USD', flags: ['●', '🇺🇸'], price: 6.82, payout: 77 },
  { base: 'SOL', quote: 'USD', flags: ['◎', '🇺🇸'], price: 142.5, payout: 81 },
];

function makeCrypto(def: PairDef, otc: boolean): Asset {
  const pair = `${def.base}/${def.quote}`;
  const slug = `${def.base.toLowerCase()}-${def.quote.toLowerCase()}`;
  return {
    id: otc ? `${slug}-otc` : slug,
    symbol: otc ? `${pair} OTC` : pair,
    name: def.base === 'BTC' ? 'Bitcoin' : def.base === 'ETH' ? 'Ethereum' : pair,
    category: 'crypto',
    isOTC: otc,
    price: def.price,
    payout: otc ? Math.max(60, def.payout - 6) : def.payout,
    change: Math.round((Math.random() - 0.5) * 300) / 100,
    flags: def.flags,
    favorite: def.favorite ?? false,
  };
}

function buildCrypto(): Asset[] {
  const assets: Asset[] = [];
  for (const def of CRYPTO) {
    assets.push(makeCrypto(def, false));
    assets.push(makeCrypto(def, true));
  }
  return assets;
}

const STOCKS: Asset[] = [
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', category: 'stocks', isOTC: false, price: 198.45, payout: 80, change: 0.67, flags: ['🍎', '🇺🇸'], favorite: false },
  { id: 'aapl-otc', symbol: 'AAPL OTC', name: 'Apple Inc.', category: 'stocks', isOTC: true, price: 198.45, payout: 72, change: 0.67, flags: ['🍎', '🇺🇸'], favorite: false },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla Inc.', category: 'stocks', isOTC: false, price: 245.32, payout: 79, change: -1.23, flags: ['⚡', '🇺🇸'], favorite: false },
  { id: 'tsla-otc', symbol: 'TSLA OTC', name: 'Tesla Inc.', category: 'stocks', isOTC: true, price: 245.32, payout: 71, change: -1.23, flags: ['⚡', '🇺🇸'], favorite: false },
  { id: 'goog', symbol: 'GOOG', name: 'Alphabet Inc.', category: 'stocks', isOTC: false, price: 172.8, payout: 78, change: 0.45, flags: ['🔍', '🇺🇸'], favorite: false },
  { id: 'goog-otc', symbol: 'GOOG OTC', name: 'Alphabet Inc.', category: 'stocks', isOTC: true, price: 172.8, payout: 70, change: 0.45, flags: ['🔍', '🇺🇸'], favorite: false },
  { id: 'amzn', symbol: 'AMZN', name: 'Amazon.com', category: 'stocks', isOTC: false, price: 185.2, payout: 77, change: 0.32, flags: ['📦', '🇺🇸'], favorite: false },
  { id: 'amzn-otc', symbol: 'AMZN OTC', name: 'Amazon.com', category: 'stocks', isOTC: true, price: 185.2, payout: 69, change: 0.32, flags: ['📦', '🇺🇸'], favorite: false },
  { id: 'msft', symbol: 'MSFT', name: 'Microsoft', category: 'stocks', isOTC: false, price: 425.6, payout: 78, change: 0.28, flags: ['💻', '🇺🇸'], favorite: false },
  { id: 'msft-otc', symbol: 'MSFT OTC', name: 'Microsoft', category: 'stocks', isOTC: true, price: 425.6, payout: 70, change: 0.28, flags: ['💻', '🇺🇸'], favorite: false },
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', category: 'stocks', isOTC: false, price: 118.4, payout: 79, change: 1.12, flags: ['🎮', '🇺🇸'], favorite: false },
  { id: 'nvda-otc', symbol: 'NVDA OTC', name: 'NVIDIA', category: 'stocks', isOTC: true, price: 118.4, payout: 71, change: 1.12, flags: ['🎮', '🇺🇸'], favorite: false },
];

const COMMODITIES: Asset[] = [
  { id: 'gold', symbol: 'GOLD', name: 'Gold', category: 'commodities', isOTC: false, price: 2348.5, payout: 83, change: 0.67, flags: ['🥇', '🇺🇸'], favorite: true },
  { id: 'gold-otc', symbol: 'GOLD OTC', name: 'Gold', category: 'commodities', isOTC: true, price: 2348.5, payout: 75, change: 0.67, flags: ['🥇', '🇺🇸'], favorite: true },
  { id: 'silver', symbol: 'SILVER', name: 'Silver', category: 'commodities', isOTC: false, price: 28.42, payout: 80, change: 0.34, flags: ['🥈', '🇺🇸'], favorite: false },
  { id: 'silver-otc', symbol: 'SILVER OTC', name: 'Silver', category: 'commodities', isOTC: true, price: 28.42, payout: 72, change: 0.34, flags: ['🥈', '🇺🇸'], favorite: false },
  { id: 'oil', symbol: 'OIL', name: 'Crude Oil', category: 'commodities', isOTC: false, price: 78.42, payout: 77, change: -0.45, flags: ['🛢️', '🇺🇸'], favorite: false },
  { id: 'oil-otc', symbol: 'OIL OTC', name: 'Crude Oil', category: 'commodities', isOTC: true, price: 78.42, payout: 69, change: -0.45, flags: ['🛢️', '🇺🇸'], favorite: false },
  { id: 'gas', symbol: 'NAT.GAS', name: 'Natural Gas', category: 'commodities', isOTC: false, price: 2.42, payout: 76, change: -0.12, flags: ['🔥', '🇺🇸'], favorite: false },
  { id: 'gas-otc', symbol: 'NAT.GAS OTC', name: 'Natural Gas', category: 'commodities', isOTC: true, price: 2.42, payout: 68, change: -0.12, flags: ['🔥', '🇺🇸'], favorite: false },
];

const INDICES: Asset[] = [
  { id: 'sp500', symbol: 'S&P 500', name: 'S&P 500 Index', category: 'indices', isOTC: false, price: 5284.2, payout: 81, change: 0.32, flags: ['📊', '🇺🇸'], favorite: false },
  { id: 'sp500-otc', symbol: 'S&P 500 OTC', name: 'S&P 500 Index', category: 'indices', isOTC: true, price: 5284.2, payout: 73, change: 0.32, flags: ['📊', '🇺🇸'], favorite: false },
  { id: 'nasdaq', symbol: 'NASDAQ', name: 'NASDAQ 100', category: 'indices', isOTC: false, price: 18452.8, payout: 80, change: 0.55, flags: ['📈', '🇺🇸'], favorite: false },
  { id: 'nasdaq-otc', symbol: 'NASDAQ OTC', name: 'NASDAQ 100', category: 'indices', isOTC: true, price: 18452.8, payout: 72, change: 0.55, flags: ['📈', '🇺🇸'], favorite: false },
  { id: 'dji', symbol: 'DJI30', name: 'Dow Jones', category: 'indices', isOTC: false, price: 39245.0, payout: 79, change: 0.22, flags: ['📉', '🇺🇸'], favorite: false },
  { id: 'dji-otc', symbol: 'DJI30 OTC', name: 'Dow Jones', category: 'indices', isOTC: true, price: 39245.0, payout: 71, change: 0.22, flags: ['📉', '🇺🇸'], favorite: false },
  { id: 'ftse', symbol: 'FTSE 100', name: 'FTSE 100', category: 'indices', isOTC: false, price: 8245.2, payout: 78, change: 0.18, flags: ['🇬🇧', '📊'], favorite: false },
  { id: 'ftse-otc', symbol: 'FTSE 100 OTC', name: 'FTSE 100', category: 'indices', isOTC: true, price: 8245.2, payout: 70, change: 0.18, flags: ['🇬🇧', '📊'], favorite: false },
  { id: 'dax', symbol: 'DAX 40', name: 'DAX 40', category: 'indices', isOTC: false, price: 18245.0, payout: 78, change: 0.25, flags: ['🇩🇪', '📊'], favorite: false },
  { id: 'dax-otc', symbol: 'DAX 40 OTC', name: 'DAX 40', category: 'indices', isOTC: true, price: 18245.0, payout: 70, change: 0.25, flags: ['🇩🇪', '📊'], favorite: false },
];

// Deduplicate EUR/USD from crosses (already in majors)
const CROSS_UNIQUE = FOREX_CROSSES.filter((p) => !(p.base === 'EUR' && p.quote === 'USD'));

export const POCKET_ASSETS: Asset[] = [
  ...buildForexPairs(FOREX_MAJORS),
  ...buildForexPairs(CROSS_UNIQUE),
  ...buildForexPairs(FOREX_EXOTICS),
  ...buildCrypto(),
  ...STOCKS,
  ...COMMODITIES,
  ...INDICES,
];

/** Symbol list only — NO prices. Used to rotate PO updateStream across all forex OTC pairs. */
export function pocketForexOtcSymbolRegistry(): BridgeAssetInput[] {
  const now = Date.now();
  return POCKET_ASSETS.filter((a) => a.category === 'forex_otc' && isForexOtcSymbol(a.symbol)).map(
    (a) => ({
      symbol: a.symbol,
      poAsset: displaySymbolToPoAsset(a.symbol),
      payout: 0,
      isOTC: true,
      category: 'forex_otc',
      timestamp: now,
    }),
  );
}

/** Seed collector/bridge when PO delays updateAssets (forex OTC only). */
export function pocketForexOtcBridgeCatalog(): BridgeAssetInput[] {
  const now = Date.now();
  return POCKET_ASSETS.filter((a) => a.category === 'forex_otc' && isForexOtcSymbol(a.symbol)).map(
    (a) => ({
      symbol: a.symbol,
      poAsset: displaySymbolToPoAsset(a.symbol),
      payout: a.payout,
      isOTC: true,
      lastKnownPrice: a.price,
      price: a.price,
      timestamp: now,
    }),
  );
}
