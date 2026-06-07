/** Client-side guard — reject cross-pair bleed (e.g. EUR/USD ~2.12). */
export function isPlausibleAssetPrice(price: number, symbol: string): boolean {
  if (!Number.isFinite(price) || price <= 0 || price >= 1_000_000) return false;
  const core = symbol.replace(/\s+OTC$/i, '').trim().toUpperCase();
  const m = core.match(/^([A-Z]{3})\/([A-Z]{3})$/);
  if (!m) return true;
  const base = m[1];
  const quote = m[2];

  if (base === 'EUR' && quote === 'USD') return price >= 0.82 && price <= 1.38;
  if (base === 'GBP' && quote === 'USD') return price >= 1.05 && price <= 1.55;
  if (base === 'AUD' && quote === 'USD') return price >= 0.5 && price <= 0.92;
  if (base === 'NZD' && quote === 'USD') return price >= 0.45 && price <= 0.85;
  if (base === 'USD' && quote === 'CAD') return price >= 1.1 && price <= 1.65;
  if (base === 'AUD' && quote === 'CAD') return price >= 0.82 && price <= 1.08;
  if (base === 'AED' && quote === 'CNY') return price >= 1.7 && price <= 2.6;
  if (quote === 'JPY' || base === 'JPY') return price >= 0.003 && price <= 400;
  return price >= 0.35 && price <= 2.25;
}
