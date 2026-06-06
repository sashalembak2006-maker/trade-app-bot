import { POCKET_ASSETS } from './pocket-assets.js';

const SYMBOL_FLAGS = new Map<string, [string, string?]>();
for (const a of POCKET_ASSETS) {
  SYMBOL_FLAGS.set(a.symbol.toUpperCase(), a.flags);
}

const CCY: Record<string, string> = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭', AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦',
  CNY: '🇨🇳', CNH: '🇨🇳', HKD: '🇭🇰', SGD: '🇸🇬', SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰', PLN: '🇵🇱',
  TRY: '🇹🇷', ZAR: '🇿🇦', MXN: '🇲🇽', BRL: '🇧🇷', INR: '🇮🇳', THB: '🇹🇭', KRW: '🇰🇷', AED: '🇦🇪',
  SAR: '🇸🇦', BHD: '🇧🇭', MAD: '🇲🇦', RUB: '🇷🇺', HUF: '🇭🇺', CZK: '🇨🇿', ILS: '🇮🇱',
};

const SPECIAL: Record<string, [string, string?]> = {
  BTC: ['₿', '🇺🇸'], ETH: ['Ξ', '🇺🇸'], LTC: ['Ł', '🇺🇸'], XRP: ['✕', '🇺🇸'],
  GOLD: ['🥇', '🇺🇸'], SILVER: ['🥈', '🇺🇸'], OIL: ['🛢️', '🇺🇸'], 'NAT.GAS': ['🔥', '🇺🇸'],
  AAPL: ['🍎', '🇺🇸'], TSLA: ['⚡', '🇺🇸'], GOOG: ['🔍', '🇺🇸'], AMZN: ['📦', '🇺🇸'],
  MSFT: ['💻', '🇺🇸'], NVDA: ['🎮', '🇺🇸'], 'S&P 500': ['📊', '🇺🇸'], NASDAQ: ['📈', '🇺🇸'],
  DJI30: ['📉', '🇺🇸'], 'FTSE 100': ['🇬🇧', '📊'], 'DAX 40': ['🇩🇪', '📊'],
};

function parseForexFlags(symbol: string): [string, string?] | null {
  const base = symbol.replace(/\s+OTC$/i, '').trim();
  const m = /^([A-Z]{3})\/([A-Z]{3})$/i.exec(base);
  if (!m) return null;
  const a = CCY[m[1].toUpperCase()] ?? '🏳️';
  const b = CCY[m[2].toUpperCase()] ?? '🏳️';
  return [a, b];
}

/** Display-only flags for UI — does not affect prices or signals. */
export function resolveAssetFlags(symbol: string): [string, string?] {
  const key = symbol.trim().toUpperCase();
  const cached = SYMBOL_FLAGS.get(key);
  if (cached) return cached;

  const forex = parseForexFlags(symbol);
  if (forex) return forex;

  const plain = key.replace(/\s+OTC$/, '');
  if (SPECIAL[plain]) return SPECIAL[plain];

  const slash = plain.split('/')[0];
  if (SPECIAL[slash]) return SPECIAL[slash];

  if (/BTC|ETH|LTC|XRP|SOL|ADA|DOT/i.test(plain)) {
    const coin = plain.match(/^[A-Z]+/)?.[0] ?? plain.slice(0, 3);
    return [SPECIAL[coin]?.[0] ?? '🪙', '🇺🇸'];
  }

  return ['💱', '🌐'];
}
