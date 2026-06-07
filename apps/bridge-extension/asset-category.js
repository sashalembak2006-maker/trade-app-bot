/* eslint-disable */
/** Mirror of packages/shared asset-category — used by bridge before POST (works without API redeploy). */
(function (root) {
  const CRYPTO = new Set([
    'BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'ADA', 'DOT', 'SOL', 'DOGE', 'BNB', 'AVAX', 'MATIC', 'LINK', 'UNI', 'SHIB',
  ]);
  const COMMODITIES = new Set(['GOLD', 'SILVER', 'OIL', 'NAT.GAS', 'PLATINUM', 'PALLADIUM', 'BRENT', 'WTI']);
  const INDEX_MARKERS = ['S&P 500', 'NASDAQ', 'DJI30', 'FTSE 100', 'DAX 40', 'NIKKEI', 'CAC 40', 'ASX 200'];

  function stripOtc(symbol) {
    return String(symbol || '').replace(/\s+OTC$/i, '').trim();
  }

  function isForexPair(base) {
    return /^[A-Z]{3}\/[A-Z]{3}$/i.test(base);
  }

  function resolveBridgeCategory(symbol, isOTC) {
    const otc = isOTC ?? /\s+OTC$/i.test(symbol);
    const base = stripOtc(symbol).toUpperCase();
    const key = String(symbol || '').trim().toUpperCase();

    if (isForexPair(base)) return otc ? 'forex_otc' : 'forex';

    const slashBase = base.split('/')[0];
    if (CRYPTO.has(slashBase) || (/\/USD$/i.test(base) && CRYPTO.has(slashBase))) return 'crypto';

    for (const marker of INDEX_MARKERS) {
      if (base.includes(marker.toUpperCase()) || key.includes(marker.toUpperCase())) return 'indices';
    }

    if (COMMODITIES.has(base)) return 'commodities';

    if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(base) && !isForexPair(base)) return 'stocks';

    return otc ? 'forex_otc' : 'forex';
  }

  root.resolveBridgeCategory = resolveBridgeCategory;
})(typeof globalThis !== 'undefined' ? globalThis : window);
