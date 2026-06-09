/** Mirror @trade-app/shared — keep web validation in sync with API/collector. */
function forexCrossBand(symbol: string): { min: number; max: number } | null {
  const core = symbol.replace(/\s+OTC$/i, '').trim().toUpperCase();
  const m = core.match(/^([A-Z]{3})\/([A-Z]{3})$/);
  if (!m) return null;
  const base = m[1];
  const quote = m[2];

  if (quote === 'JPY' || base === 'JPY') return { min: 0.003, max: 400 };
  if (base === 'AED' && quote === 'CNY') return { min: 1.7, max: 2.6 };
  if (quote === 'CNY' && base !== 'USD') return { min: 0.4, max: 3.2 };
  if (base === 'EUR' && quote === 'USD') return { min: 0.82, max: 1.38 };
  if (base === 'GBP' && quote === 'USD') return { min: 1.05, max: 1.55 };
  if (base === 'AUD' && quote === 'USD') return { min: 0.5, max: 0.92 };
  if (base === 'NZD' && quote === 'USD') return { min: 0.45, max: 0.85 };
  if (base === 'USD' && quote === 'CAD') return { min: 1.1, max: 1.65 };
  if (base === 'USD' && quote === 'CHF') return { min: 0.72, max: 1.08 };
  if (base === 'EUR' && quote === 'GBP') return { min: 0.78, max: 0.98 };
  if (base === 'AUD' && quote === 'CAD') return { min: 0.82, max: 1.08 };
  if (base === 'AUD' && quote === 'NZD') return { min: 1.0, max: 1.25 };
  if (base === 'EUR' && quote === 'JPY') return { min: 120, max: 200 };
  if (base === 'GBP' && quote === 'JPY') return { min: 140, max: 240 };
  if (base === 'USD' && quote === 'JPY') return { min: 100, max: 200 };

  if (/CLP|COP|IDR|VND|KRW|HUF|NGN|PYG|IRR|IQD|VEF/.test(core)) {
    return { min: 0.01, max: 100_000 };
  }
  if (/INR|TRY|RUB|CNH|BRL|MXN|LBP|PHP|THB|MYR|ZAR|ARS|PLN|CZK|DKK|SEK|NOK|MAD|KES|JOD/.test(core)) {
    return { min: 0.01, max: 5_000 };
  }

  return { min: 0.35, max: 2.25 };
}

function priceRangeForSymbol(symbol: string): { min: number; max: number } {
  const s = symbol.toUpperCase();
  if (/BTC|ETH/.test(s)) return { min: 50, max: 500_000 };
  if (/GOLD|XAU|SILVER|XAG/.test(s)) return { min: 10, max: 50_000 };
  const fx = forexCrossBand(symbol);
  if (fx) return fx;
  if (/CLP|COP|IDR|VND|KRW|HUF|NGN|PYG|IRR|IQD|VEF/.test(s)) {
    return { min: 0.01, max: 100_000 };
  }
  if (/INR|TRY|RUB|CNH|BRL|MXN|LBP|PHP|THB|MYR|ZAR|ARS|PLN|CZK|DKK|SEK|NOK|MAD|KES|JOD/.test(s)) {
    return { min: 0.01, max: 5_000 };
  }
  return { min: 0.000_01, max: 25 };
}

export function isPlausibleAssetPrice(price: number, symbol: string): boolean {
  if (!Number.isFinite(price) || price <= 0 || price >= 1_000_000) return false;
  if (price >= 1e8 && price <= 2.2e12) return false;

  const { min, max } = priceRangeForSymbol(symbol);
  if (price < min || price > max) return false;

  if (price >= 50 && price <= 99 && Math.abs(price - Math.round(price)) < 0.0001) return false;
  if (price >= 1 && price <= 100 && Math.abs(price - Math.round(price)) < 0.0001) {
    if (/\/(USD|EUR|GBP|AUD|NZD|CHF|CAD)\b/i.test(symbol) && !/JPY|BTC|ETH|GOLD|SILVER/i.test(symbol)) {
      if (price >= 10 && price <= 99) return false;
    }
  }
  if (price >= 20 && price <= 100 && max <= 25) return false;

  return true;
}
