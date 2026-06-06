/** Rough min/max for a symbol — rejects RSI (~65), payout %, etc. */
export function priceRangeForSymbol(symbol?: string): { min: number; max: number } {
  const s = (symbol ?? '').toUpperCase();
  if (/BTC|ETH/.test(s)) return { min: 50, max: 500_000 };
  if (/GOLD|XAU|SILVER|XAG/.test(s)) return { min: 10, max: 50_000 };
  if (/JPY/.test(s)) return { min: 40, max: 500 };
  // USD/CLP ~900, USD/COP ~4000, USD/IDR ~16000, etc.
  if (/CLP|COP|IDR|VND|KRW|HUF|NGN|PYG|IRR|IQD|VEF/.test(s)) {
    return { min: 0.01, max: 100_000 };
  }
  if (/INR|TRY|RUB|CNH|BRL|MXN|LBP|PHP|THB|MYR|ZAR|ARS|PLN|CZK|DKK|SEK|NOK/.test(s)) {
    return { min: 0.01, max: 5_000 };
  }
  return { min: 0.000_01, max: 25 };
}

/** Reject timestamps / payout / RSI / garbage masquerading as forex prices. */
export function isPlausibleMarketPrice(price: number, symbol?: string): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  if (price >= 1_000_000) return false;
  if (price >= 1e8 && price <= 2.2e12) return false;

  const { min, max } = priceRangeForSymbol(symbol);
  if (price < min || price > max) return false;

  if (price >= 50 && price <= 99 && Math.abs(price - Math.round(price)) < 0.0001) return false;
  if (price >= 1 && price <= 100 && Math.abs(price - Math.round(price)) < 0.0001) {
    const sym = symbol ?? '';
    if (/\/(USD|EUR|GBP|AUD|NZD|CHF|CAD)\b/i.test(sym) && !/JPY|BTC|ETH|GOLD|SILVER/i.test(sym)) {
      if (price >= 10 && price <= 99) return false;
    }
  }

  if (price >= 20 && price <= 100 && max <= 25) return false;

  return true;
}
