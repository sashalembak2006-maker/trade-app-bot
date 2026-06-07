/* eslint-disable */
/**
 * Platform Bridge — content script.
 * Scrapes ALL visible Pocket Option assets (symbol + payout; live price for active pair).
 */
(function () {
  /** Fallback if manifest MAIN-world page-hook did not run (CSP / timing). */
  (function ensurePageHook() {
    try {
      const files = ['binary-decoder.js', 'asset-category.js', 'page-hook.js'];
      let i = 0;
      function next() {
        if (i >= files.length) return;
        const s = document.createElement('script');
        s.src = chrome.runtime.getURL(files[i++]);
        s.onload = () => {
          s.remove();
          next();
        };
        (document.documentElement || document.head || document.body).appendChild(s);
      }
      next();
    } catch (e) {
      console.warn('[PRIME Bridge] page-hook inject failed', e);
    }
  })();

  const QUOTE_NUMBER_RE = /\b(\d{1,5}[.,]\d{2,6})\b/g;

  const SYMBOL_SELECTORS = [
    '.current-symbol',
    '.current-symbol_cropped',
    '.asset-select__title',
    '[class*="currentSymbol"]',
    '[class*="current-symbol"]',
    '.tw-tooltip__container .asset__name',
    '[class*="pair"] [class*="name"]',
    '[class*="asset-name"]',
  ];

  /** PO live quote — only these first (not generic [class*="price"]). */
  const PRIMARY_QUOTE_SELECTORS = [
    '.value__val-start',
    '.value__val.value__val-start',
    '.block--pair .value__val-start',
    '.block--current-price .value__val',
    '.chart-quote__value',
    '[class*="chart-quote"]',
    '.pane-legend-item-value',
    '.js-symbol-last',
  ];

  const PRICE_SELECTORS = [
    '.value__val-start',
    '.value__val.value__val-start',
    '.open-time .value__val',
    '.block--open-time .value__val',
    '.block--pair .value__val-start',
    '.block--current-price .value__val',
    '.chart-quote__value',
    '[class*="chart-quote"]',
    '[class*="currentPrice"]',
    '[class*="current-price"]',
    '[class*="quote-value"]',
    '[class*="rate-value"]',
    '.pane-legend-item-value',
    '.js-symbol-last',
    '.symbol-price',
    '[class*="last-price"]',
    '[class*="LastPrice"]',
    '[class*="open-time"] .value__val',
    '.trading-panel [class*="price"]',
    '.block--payout ~ * [class*="value"]',
    '.section-deal__price',
    '.section-deal__rate',
    '[class*="deal"] [class*="price"]',
    '[class*="deal"] [class*="rate"]',
  ];

  const PAYOUT_SELECTORS = [
    '.value__val.value__val--profit',
    '.payout-settings__value',
    '[class*="payout"] [class*="value"]',
    '.estimated-profit__percent',
    '[class*="profit"] [class*="percent"]',
  ];

  const LIST_ROW_SELECTORS = [
    '.alist__item',
    '.assets-table__item',
    '.assets-block__item',
    '.assets-block-list__item',
    '.assets-favorites-item',
    '.top-assets__item',
    '[class*="favorites"] [class*="item"]',
    '[class*="AssetItem"]',
    '[class*="asset-item"]',
    '.dock-item',
  ];

  const LIST_NAME_SELECTORS = [
    '.alist__label',
    '.assets-table__name',
    '.assets-block__label',
    '.assets-block__name',
    '[class*="asset"] [class*="label"]',
    '[class*="asset"] [class*="name"]',
    '[class*="symbol"]',
  ];

  const LIST_PRICE_SELECTORS = [
    '.assets-block__rate',
    '.assets-table__price',
    '.alist__price',
    '[class*="price"]',
    '[class*="quote"]',
    '[class*="rate"]',
  ];

  let contextDead = false;
  let tickTimer = null;
  let lastLogKey = '';
  const wsAssets = new Map();
  let wsActiveSymbol = null;

  function withCategory(a) {
    if (!a?.symbol) return a;
    const isOTC = a.isOTC ?? /otc/i.test(a.symbol);
    return {
      ...a,
      isOTC,
      category:
        a.category ||
        (typeof resolveBridgeCategory === 'function'
          ? resolveBridgeCategory(a.symbol, isOTC)
          : isOTC
            ? 'forex_otc'
            : 'forex'),
    };
  }

  function priceRangeForSymbol(symbol) {
    const s = (symbol || '').toUpperCase();
    if (/BTC|ETH|LTC|XRP|SOL|ADA|DOT|DOGE|BNB|AVAX|MATIC|LINK|BCH/.test(s)) {
      return { min: 0.0001, max: 500_000 };
    }
    if (/GOLD|XAU|SILVER|XAG|OIL|NAT\.GAS|PLATINUM|PALLADIUM|BRENT|WTI/.test(s)) {
      return { min: 0.01, max: 50_000 };
    }
    if (/S&P|NASDAQ|DJI|DAX|FTSE|NIKKEI|CAC|ASX|INDEX/.test(s)) {
      return { min: 10, max: 100_000 };
    }
    // Stock tickers (AAPL, TSLA…) — not XXX/YYY forex pairs.
    const plain = s.replace(/\s+OTC$/, '').trim();
    if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(plain) && !/^[A-Z]{3}\/[A-Z]{3}$/.test(plain)) {
      return { min: 0.5, max: 100_000 };
    }
    if (/JPY/.test(s)) return { min: 40, max: 500 };
    if (/CLP|COP|IDR|VND|KRW|HUF|NGN|PYG|IRR|IQD|VEF/.test(s)) {
      return { min: 0.01, max: 100_000 };
    }
    if (/INR|TRY|RUB|CNH|BRL|MXN|LBP|PHP|THB|MYR|ZAR|ARS|PLN|CZK|DKK|SEK|NOK/.test(s)) {
      return { min: 0.01, max: 5_000 };
    }
    return { min: 0.000_01, max: 25 };
  }

  function quotePrecision(text) {
    const norm = String(text ?? '').trim().replace(',', '.');
    const dot = norm.indexOf('.');
    if (dot < 0) return 0;
    return norm.length - dot - 1;
  }

  /** DOM text: 2+ decimals. WS numeric: 2+ decimals. */
  function hasLiveQuotePrecision(price, sourceText) {
    if (sourceText != null && sourceText !== '') {
      return quotePrecision(sourceText) >= 2;
    }
    const frac = price.toFixed(8).replace(/0+$/, '').split('.')[1] || '';
    return frac.length >= 2;
  }

  /** WebSocket tick — reject payout integers (91, 92). */
  function sanitizeWsPrice(price, symbol, payout) {
    if (price == null || !Number.isFinite(price)) return null;
    if (price <= 0 || price >= 1_000_000) return null;
    if (payout != null && (price === payout || Math.abs(price - payout) < 0.01)) return null;
    const { min, max } = priceRangeForSymbol(symbol);
    if (price < min || price > max) return null;
    if (price >= 20 && price <= 100 && max <= 25) return null;
    const frac = price.toFixed(10).replace(/0+$/, '').split('.')[1] || '';
    if (frac.length < 2) return null;
    if (price >= 50 && price <= 99 && frac.length <= 1) return null;
    return price;
  }

  function isDealControlElement(el) {
    if (!el) return false;
    return !!el.closest(
      '.section-deal__amount, .block--amount, .block--time, [class*="investment"], [class*="amount"], [class*="expiration"], [class*="timeframe"], .control__value, [class*="deal-amount"], [class*="balance"]',
    );
  }

  function sanitizePrice(price, symbol, payout, sourceText) {
    if (price == null || !Number.isFinite(price)) return null;
    if (price <= 0 || price >= 1_000_000) return null;
    if (payout != null && price === payout) return null;
    const { min, max } = priceRangeForSymbol(symbol);
    if (price < min || price > max) return null;
    if (price >= 20 && price <= 100 && max <= 25) return null;
    if (payout != null && price >= 1 && price <= 100 && Math.abs(price - Math.round(price)) < 0.0001) {
      return null;
    }
    if (!hasLiveQuotePrecision(price, sourceText ?? '')) return null;
    return price;
  }

  /** RSI/MACD sub-panes only — NOT the main price scale (pane-legend). */
  function isIndicatorPane(node) {
    let el = node?.parentElement ?? node;
    while (el) {
      const cls = String(el.className || '');
      if (/rsi|macd|stochastic|cci|williams|momentum|ao-panel|study[-_]|indicator[-_]/i.test(cls)) {
        return true;
      }
      if (el.tagName === 'CANVAS') return true;
      el = el.parentElement;
    }
    return false;
  }

  function priceBucketKey(n) {
    return n.toFixed(5);
  }

  /** Chart Y-axis repeats the live quote — pick the most frequent in-range decimal. */
  function pickPriceByFrequency(activeSymbol, payout) {
    const hits = [];
    const re = QUOTE_NUMBER_RE;
    const text = document.body?.innerText || '';
    let m;
    while ((m = re.exec(text)) !== null) {
      const p = sanitizePrice(parseFloat(m[1].replace(',', '.')), activeSymbol, payout, m[1]);
      if (p != null) hits.push(p);
    }
    if (!hits.length) return null;

    const buckets = new Map();
    for (const h of hits) {
      const key = priceBucketKey(h);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    let bestKey = null;
    let bestCount = 0;
    for (const [key, count] of buckets) {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    }
    if (bestKey && bestCount >= 2) return parseFloat(bestKey);
    const ranked = [...buckets.keys()]
      .map((k) => ({ k, c: buckets.get(k) || 0, p: parseFloat(k) }))
      .sort((a, b) => b.c - a.c);
    return ranked[0]?.p ?? null;
  }

  function rankPriceCandidates(candidates) {
    return [...candidates].sort((a, b) => {
      const aPri = /value__val-start|chart-quote|pane-legend|js-symbol-last/i.test(a.source || '') ? 0 : 1;
      const bPri = /value__val-start|chart-quote|pane-legend|js-symbol-last/i.test(b.source || '') ? 0 : 1;
      if (aPri !== bPri) return aPri - bPri;
      const aPrec = quotePrecision(a.text);
      const bPrec = quotePrecision(b.text);
      if (bPrec !== aPrec) return bPrec - aPrec;
      return 0;
    });
  }

  function pickBestFromElements(selectors, activeSymbol, payout) {
    const candidates = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        if (isPayoutElement(el) || isIndicatorPane(el) || isDealControlElement(el)) return;
        const text = (el.textContent || '').trim();
        if (!text || text.includes('%')) return;
        const p = sanitizePrice(parseNumber(text), activeSymbol, payout, text);
        if (p != null) candidates.push({ p, sel, text, source: sel });
      });
    }
    const ranked = rankPriceCandidates(candidates);
    return ranked[0]?.p ?? null;
  }

  /** TradingView / PO price scale labels (e.g. 1.28514 on Y-axis). */
  function scrapeChartAxisPrices(activeSymbol, payout) {
    const roots = [
      '.tv-lightweight-charts',
      '.chart-markup-table',
      '[class*="chart-container"]',
      '[class*="price-axis"]',
      '[class*="pane"]',
      '.layout-chart',
    ];
    const hits = [];
    for (const rootSel of roots) {
      document.querySelectorAll(rootSel).forEach((root) => {
        if (isIndicatorPane(root)) return;
        const re = QUOTE_NUMBER_RE;
        const text = root.innerText || '';
        let m;
        while ((m = re.exec(text)) !== null) {
          const p = sanitizePrice(parseFloat(m[1]), activeSymbol, payout, m[1]);
          if (p != null) hits.push(p);
        }
      });
    }
    if (!hits.length) return null;
    const buckets = new Map();
    for (const h of hits) {
      const k = priceBucketKey(h);
      buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    let best = null;
    let bestCount = 0;
    for (const [k, c] of buckets) {
      if (c > bestCount) {
        bestCount = c;
        best = parseFloat(k);
      }
    }
    return bestCount >= 1 ? best : null;
  }

  /** Full-page scan: chart Y-axis repeats live quote (867.5468 for USD/CLP). */
  function scrapeQuoteFromPageText(activeSymbol, payout) {
    const hits = [];
    const re = QUOTE_NUMBER_RE;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (isIndicatorPane(node) || isDealControlElement(node.parentElement)) continue;
      const block = node.textContent || '';
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(block)) !== null) {
        const p = sanitizePrice(parseFloat(m[1].replace(',', '.')), activeSymbol, payout, m[1]);
        if (p != null) hits.push(p);
      }
    }
    if (!hits.length) return null;
    const buckets = new Map();
    for (const h of hits) {
      const k = priceBucketKey(h);
      buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    let best = null;
    let bestCount = 0;
    for (const [k, c] of buckets) {
      if (c > bestCount) {
        bestCount = c;
        best = parseFloat(k);
      }
    }
    return best;
  }

  function scrapePriceNearSymbol(activeSymbol, payout) {
    for (const sel of SYMBOL_SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      let box = el.parentElement;
      for (let d = 0; d < 5 && box; d++) {
        const re = QUOTE_NUMBER_RE;
        let m;
        while ((m = re.exec(box.textContent || '')) !== null) {
          const p = sanitizePrice(parseFloat(m[1].replace(',', '.')), activeSymbol, payout, m[1]);
          if (p != null) return p;
        }
        box = box.parentElement;
      }
    }
    return null;
  }

  function scrapeChartLegendPrice(activeSymbol, payout) {
    const legendSels = [
      '.pane-legend-item-value',
      '.pane-legend-line__value',
      '[class*="pane-legend"] [class*="value"]',
      '.chart-quote__value',
      '.js-symbol-last',
    ];
    const hits = [];
    for (const sel of legendSels) {
      document.querySelectorAll(sel).forEach((el) => {
        if (isIndicatorPane(el)) return;
        const text = (el.textContent || '').trim();
        const p = sanitizePrice(parseNumber(text), activeSymbol, payout, text);
        if (p != null) hits.push({ p, text });
      });
    }
    if (!hits.length) return null;
    const ranked = rankPriceCandidates(
      hits.map((h) => ({ parsed: h.p, text: h.text, source: 'legend' })),
    );
    if (ranked.length) return ranked[0].parsed;
    const buckets = new Map();
    for (const h of hits) {
      const key = priceBucketKey(h.p);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    let best = hits[0].p;
    let bestCount = 0;
    for (const [key, count] of buckets) {
      if (count > bestCount) {
        bestCount = count;
        best = parseFloat(key);
      }
    }
    return best;
  }

  function clearWsPricesExcept(symbol) {
    for (const [sym, val] of wsAssets) {
      if (sym !== symbol && val.price != null) {
        const { price: _p, ...rest } = val;
        wsAssets.set(sym, rest);
      }
    }
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || ev.data?.source !== 'prime-bridge-po') return;
    if (ev.data.type === 'assets' && Array.isArray(ev.data.assets)) {
      for (const a of ev.data.assets) {
        if (!a?.symbol || typeof a.payout !== 'number' || a.payout < 1 || a.payout > 100) continue;
        const prev = wsAssets.get(a.symbol);
        wsAssets.set(a.symbol, withCategory({
          ...prev,
          symbol: a.symbol,
          payout: a.payout,
          isOTC: a.isOTC ?? prev?.isOTC,
          category: a.category ?? prev?.category,
          timestamp: a.timestamp ?? Date.now(),
        }));
      }
    }
    if (ev.data.type === 'stream' && typeof ev.data.price === 'number') {
      let sym = ev.data.symbol;
      if (!sym || !looksLikeSymbol(sym)) {
        sym = wsActiveSymbol || readActiveSymbolFromDom();
      }
      if (!sym || !looksLikeSymbol(sym)) return;
      const p = sanitizeWsPrice(ev.data.price, sym, wsAssets.get(sym)?.payout);
      if (p == null) return;
      const prev = wsAssets.get(sym) || { symbol: sym, payout: 92, isOTC: /otc/i.test(sym) };
      wsActiveSymbol = sym;
      wsAssets.set(sym, { ...prev, price: p, timestamp: ev.data.timestamp || Date.now() });
    }
    if (ev.data.type === 'active' && ev.data.symbol) {
      wsActiveSymbol = ev.data.symbol;
    }
    if (ev.data.type === 'stream-sample' && ev.data.sample) {
      try {
        chrome.storage?.local?.get({ prime_bridge_stream_samples: [] }, (bag) => {
          const list = Array.isArray(bag.prime_bridge_stream_samples)
            ? bag.prime_bridge_stream_samples
            : [];
          list.push(ev.data.sample);
          while (list.length > 80) list.shift();
          chrome.storage.local.set({ prime_bridge_stream_samples: list });
        });
      } catch {
        /* storage unavailable */
      }
    }
    if (ev.data.type === 'binary-debug' && ev.data.all) {
      try {
        chrome.storage.local.set({
          prime_bridge_binary_debug: ev.data.all,
          prime_bridge_binary_debug_at: Date.now(),
        });
      } catch {
        /* storage unavailable */
      }
    }
  });

  function pickText(root, candidates) {
    for (const sel of candidates) {
      const el = (root || document).querySelector(sel);
      if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
    }
    return null;
  }

  function parseNumber(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n) || Math.abs(n) >= 1_000_000) return null;
    return n;
  }

  function parsePayout(text) {
    if (!text) return null;
    const m = text.match(/(\d{1,3})\s*%/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n >= 1 && n <= 100 ? n : null;
  }

  function isPayoutElement(el) {
    if (!el) return false;
    const text = (el.textContent || '').trim();
    if (text.includes('%')) return true;
    const cls = `${el.className || ''} ${el.parentElement?.className || ''}`;
    if (/profit|payout|percent/i.test(cls)) return true;
    if (el.closest('.value__val--profit, [class*="payout"], [class*="profit"], [class*="estimated-profit"]')) {
      return true;
    }
    return false;
  }

  function looksLikeSymbol(s) {
    if (!s) return false;
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length < 3 || t.length > 64) return false;
    if (/method|deposit|bonus|profile|setting|payment|withdraw|quick|high|low|trade/i.test(t)) {
      return false;
    }
    if (/[A-Z]{2,6}\/[A-Z]{2,6}(\s+OTC)?/i.test(t)) return true;
    if (/^(BTC|ETH|GOLD|SILVER|OIL|AAPL|TSLA|GOOG|AMZN|MSFT|NVDA)(\s+OTC)?$/i.test(t)) {
      return true;
    }
    // PO stocks/indices: "American Express OTC", "Boeing Company OTC", "S&P 500 OTC"
    if (/\s+OTC$/i.test(t) && !/[A-Z]{3}\/[A-Z]{3}/.test(t)) return true;
    if (/^(S&P|S&P 500|NASDAQ|DJI30|FTSE|GOLD|SILVER|OIL|NAT\.GAS)/i.test(t)) return true;
    return false;
  }

  /** True on chart / quick trading — NOT the account dashboard (/cabinet only). */
  function isTradingTerminal() {
    const p = (location.pathname || '').toLowerCase();
    if (
      p.includes('quick-high-low') ||
      p.includes('high-low') ||
      p.includes('/try/') ||
      p.includes('demo') ||
      p.includes('cabinet/demo')
    ) {
      return true;
    }
    const hasChart = !!document.querySelector(
      'canvas, .chart-container, [class*="chart-container"], [class*="trading-panel"], .js-chart, [class*="terminal"]',
    );
    const hasPair = /[A-Z]{3}\/[A-Z]{3}/.test(document.body?.innerText || '');
    if (hasChart && hasPair) return true;
    if (p.includes('/cabinet') && hasChart) return true;
    return hasChart;
  }

  function symbolsMatch(a, b) {
    if (!a || !b) return false;
    const na = normalizeSymbol(a).replace(/\s+OTC$/i, '').toLowerCase();
    const nb = normalizeSymbol(b).replace(/\s+OTC$/i, '').toLowerCase();
    return na === nb;
  }

  function normalizeSymbol(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  function isDecimalForexPrice(text) {
    const normalized = text.replace(',', '.');
    return /\d+\.\d{2,}/.test(normalized);
  }

  function isValidPayout(n) {
    return n != null && Number.isInteger(n) && n >= 1 && n <= 100;
  }

  function isValidPrice(symbol, price, payout) {
    return sanitizePrice(price, symbol, payout) != null;
  }

  function collectPayoutCandidates() {
    const out = [];
    const seen = new Set();
    for (const sel of PAYOUT_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        const text = (el.textContent || '').trim();
        if (!text || seen.has(text)) return;
        seen.add(text);
        out.push({ source: sel, text, parsed: parsePayout(text) ?? parseNumber(text) });
      });
    }
    return out;
  }

  function collectPriceCandidates() {
    const out = [];
    const seen = new Set();

    function add(source, el) {
      if (!el || isPayoutElement(el) || isDealControlElement(el)) return;
      const text = (el.textContent || '').trim();
      if (!text || text.includes('%') || seen.has(text)) return;
      seen.add(text);
      out.push({ source, text, parsed: parseNumber(text) });
    }

    for (const sel of PRICE_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => add(sel, el));
    }

    document.querySelectorAll('.value__val-start').forEach((el) => {
      const text = (el.textContent || '').trim();
      if (!text || isPayoutElement(el) || !isDecimalForexPrice(text)) return;
      add('.value__val-start (decimal only)', el);
    });

    return out;
  }

  function pickPayout(candidates) {
    for (const c of candidates) {
      const fromPercent = parsePayout(c.text);
      if (isValidPayout(fromPercent)) return fromPercent;
      if (isValidPayout(c.parsed) && c.text.includes('%')) return c.parsed;
    }
    for (const c of candidates) {
      if (isValidPayout(c.parsed)) return c.parsed;
    }
    return null;
  }

  function pickPrice(candidates, symbol, payout) {
    const filtered = candidates
      .filter((c) => sanitizePrice(c.parsed, symbol, payout, c.text) != null)
      .map((c) => ({ ...c, parsed: sanitizePrice(c.parsed, symbol, payout, c.text) }));
    const ranked = rankPriceCandidates(filtered);
    return ranked[0]?.parsed ?? null;
  }

  function extractSymbolFromText(text) {
    if (!text) return null;
    const m = text.match(
      /([A-Z]{2,6}\/[A-Z]{2,6}(?:\s+OTC)?|(?:BTC|ETH|GOLD|SILVER|OIL|AAPL|TSLA)[^%\n]{0,12})/i,
    );
    if (m) return normalizeSymbol(m[1].trim());
    const stock = text.match(/([A-Za-z0-9][A-Za-z0-9\s.&'/-]{2,52}\s+OTC)/i);
    if (stock) return normalizeSymbol(stock[1].trim());
    return null;
  }

  function cleanListName(name) {
    if (!name) return null;
    return normalizeSymbol(
      name
        .replace(/\s+/g, ' ')
        .replace(/\s+\d{1,3}%\s*$/, '')
        .trim(),
    );
  }

  function findSymbolInRow(row) {
    let name = cleanListName(pickText(row, LIST_NAME_SELECTORS));
    if (name && looksLikeSymbol(name)) return name;
    const fromText = extractSymbolFromText(row.textContent || '');
    if (fromText && looksLikeSymbol(fromText)) return fromText;
    const lines = (row.textContent || '').split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cleaned = cleanListName(line);
      if (cleaned && looksLikeSymbol(cleaned)) return cleaned;
      const sym = extractSymbolFromText(line);
      if (sym && looksLikeSymbol(sym)) return sym;
    }
    return null;
  }

  function findPriceInRow(row, symbol, payout) {
    for (const sel of LIST_PRICE_SELECTORS) {
      const el = row.querySelector(sel);
      if (!el || isPayoutElement(el)) continue;
      const n = parseNumber(el.textContent);
      if (isValidPrice(symbol, n, payout)) return n;
    }
    const chunks = (row.textContent || '').split(/\s+/);
    for (const chunk of chunks) {
      if (chunk.includes('%')) continue;
      const n = parseNumber(chunk);
      if (isValidPrice(symbol, n, payout)) return n;
    }
    return null;
  }

  function parseListRow(row) {
    const symbol = findSymbolInRow(row);
    if (!symbol) return null;
    const payout = parsePayout(row.textContent || '');
    if (!isValidPayout(payout)) return null;

    return withCategory({
      symbol,
      payout,
      isOTC: /otc/i.test(symbol),
      timestamp: Date.now(),
    });
  }

  function scrapeList() {
    const out = new Map();
    const seenRows = new Set();

    function addRow(row) {
      if (!row || seenRows.has(row)) return;
      seenRows.add(row);
      const asset = parseListRow(row);
      if (asset) out.set(asset.symbol, asset);
    }

    for (const sel of LIST_ROW_SELECTORS) {
      document.querySelectorAll(sel).forEach(addRow);
    }

    document
      .querySelectorAll('.assets-block, .alist, [class*="assets-block"], [class*="assets-list"]')
      .forEach((container) => {
        container.querySelectorAll('[class*="item"], li, a, tr').forEach(addRow);
      });

    // PO stocks panel: rows with "Company Name OTC" + payout %
    document
      .querySelectorAll('.assets-block, .alist, [class*="assets-block"], [class*="asset-select"], [class*="modal"]')
      .forEach((panel) => {
        panel.querySelectorAll('[class*="item"], li, a, tr, div[class*="row"]').forEach((row) => {
          const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
          if (!/\s+OTC/i.test(text)) return;
          const sym = extractSymbolFromText(text);
          const payout = parsePayout(text);
          if (!sym || !isValidPayout(payout)) return;
          out.set(sym, withCategory({ symbol: sym, payout, isOTC: true, timestamp: Date.now() }));
        });
      });

    for (const a of scrapeViaPayoutNearby()) {
      if (!out.has(a.symbol)) out.set(a.symbol, a);
    }

    return Array.from(out.values());
  }

  /** Find pairs by nearby "+92%" labels (mobile / bottom bar). */
  function scrapeViaPayoutNearby() {
    const out = new Map();
    const nodes = document.querySelectorAll('span, div, p, a, li, button, label');
    for (const el of nodes) {
      if (el.children.length > 0) continue;
      const t = (el.textContent || '').trim();
      const payout = parsePayout(t);
      if (payout == null) continue;

      let box = el.parentElement;
      for (let d = 0; d < 6 && box; d++) {
        const symbol = findSymbolInRow(box);
        if (symbol) {
          out.set(symbol, withCategory({
            symbol,
            payout,
            isOTC: /otc/i.test(symbol),
            timestamp: Date.now(),
          }));
          break;
        }
        box = box.parentElement;
      }
    }
    return Array.from(out.values());
  }

  function scrapeActiveFromSelection(list) {
    const selected = document.querySelector(
      '.assets-block__item--active, .assets-block__item.active, [class*="item--active"], [class*="item_active"], [class*="current-pair"]',
    );
    if (selected) {
      const asset = parseListRow(selected);
      if (asset) return asset;
    }
    if (list.length === 1) return list[0];
    return null;
  }

  function scrapeActive() {
    const symbolRaw = pickText(document, SYMBOL_SELECTORS);
    const symbol = symbolRaw ? normalizeSymbol(symbolRaw) : null;
    const payoutCandidates = collectPayoutCandidates();
    const priceCandidates = collectPriceCandidates();
    const payout = pickPayout(payoutCandidates);

    if (!symbol || !looksLikeSymbol(symbol) || payout == null) return null;

    const price = pickPrice(priceCandidates, symbol, payout);
    const payload = withCategory({
      symbol,
      payout,
      isOTC: /otc/i.test(symbol),
      timestamp: Date.now(),
    });
    if (price != null) payload.price = price;
    return payload;
  }

  function readActiveSymbolFromDom() {
    const symbolRaw = pickText(document, SYMBOL_SELECTORS);
    if (symbolRaw && looksLikeSymbol(symbolRaw)) return normalizeSymbol(symbolRaw);
    const domActive = scrapeActive();
    if (domActive?.symbol) return domActive.symbol;
    return null;
  }

  function resolveActiveSymbol(list) {
    if (wsActiveSymbol && looksLikeSymbol(wsActiveSymbol)) return wsActiveSymbol;
    const domSym = readActiveSymbolFromDom();
    if (domSym) return domSym;
    const selected = scrapeActiveFromSelection(list);
    if (selected?.symbol) return selected.symbol;
    return null;
  }

  /** Leaf nodes with exact quote text (e.g. 0.46925 on chart axis). */
  function scrapeLeafQuoteNodes(activeSymbol, payout) {
    const hits = [];
    document.querySelectorAll('span, div, label, td, p').forEach((el) => {
      if (el.children.length > 0) return;
      if (isDealControlElement(el) || isIndicatorPane(el)) return;
      const t = (el.textContent || '').trim();
      if (!/^\d{1,5}[.,]\d{2,6}$/.test(t)) return;
      const p = sanitizePrice(parseFloat(t.replace(',', '.')), activeSymbol, payout, t);
      if (p != null) hits.push({ p, t });
    });
    if (!hits.length) return null;
    const buckets = new Map();
    for (const h of hits) {
      const k = priceBucketKey(h.p);
      buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    let best = hits[0].p;
    let bestCount = 0;
    for (const [k, c] of buckets) {
      if (c > bestCount) {
        bestCount = c;
        best = parseFloat(k);
      }
    }
    return best;
  }

  /** Live quote: primary PO selectors → legend → near symbol → frequency. */
  function scrapeLiveQuote(activeSymbol, payout) {
    const leaves = scrapeLeafQuoteNodes(activeSymbol, payout);
    if (leaves != null) return leaves;

    const primary = pickBestFromElements(PRIMARY_QUOTE_SELECTORS, activeSymbol, payout);
    if (primary != null) return primary;

    const broad = pickBestFromElements(PRICE_SELECTORS, activeSymbol, payout);
    if (broad != null) return broad;

    const legend = scrapeChartLegendPrice(activeSymbol, payout);
    if (legend != null) return legend;

    const nearSym = scrapePriceNearSymbol(activeSymbol, payout);
    if (nearSym != null) return nearSym;

    const freq = pickPriceByFrequency(activeSymbol, payout);
    if (freq != null) return freq;

    const axis = scrapeChartAxisPrices(activeSymbol, payout);
    if (axis != null) return axis;

    const pageText = scrapeQuoteFromPageText(activeSymbol, payout);
    if (pageText != null) return pageText;

    // Shadow DOM / nested widgets (PO sometimes mounts price inside custom elements).
    try {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (!el.shadowRoot) continue;
        for (const sel of PRICE_SELECTORS) {
          const hit = el.shadowRoot.querySelector(sel);
          if (!hit || isPayoutElement(hit)) continue;
          const ht = (hit.textContent || '').trim();
          const p = sanitizePrice(parseNumber(ht), activeSymbol, payout, ht);
          if (p != null) return p;
        }
      }
    } catch { /* ignore */ }

    return null;
  }

  function resolveActivePrice(activeSymbol, payout) {
    const wsEntry = wsAssets.get(activeSymbol);
    if (wsEntry?.price != null) {
      const p = sanitizeWsPrice(wsEntry.price, activeSymbol, payout);
      if (p != null) return p;
    }

    const live = scrapeLiveQuote(activeSymbol, payout);
    if (live != null) return live;

    const domActive = scrapeActive();
    if (domActive?.symbol === activeSymbol && domActive.price != null) {
      const p = sanitizePrice(domActive.price, activeSymbol, payout, String(domActive.price));
      if (p != null) return p;
    }

    return pickPrice(collectPriceCandidates(), activeSymbol, payout);
  }

  /** Last resort: read visible text on trading terminal (PO UI changes often). */
  function scrapeTradingFallback() {
    if (!isTradingTerminal()) return [];

    const bodyText = document.body?.innerText || '';
    const pairs = new Set();
    const pairRe = /\b([A-Z]{3}\/[A-Z]{3})(?:\s+OTC)?\b/g;
    let pm;
    while ((pm = pairRe.exec(bodyText)) !== null) {
      const sym = pm[0].toUpperCase().includes('OTC') ? `${pm[1]} OTC` : pm[1];
      if (looksLikeSymbol(sym)) pairs.add(sym);
    }

    let payout = null;
    const payoutRe = /\+?(\d{2,3})\s*%/g;
    let pp;
    while ((pp = payoutRe.exec(bodyText)) !== null) {
      const n = parseInt(pp[1], 10);
      if (n >= 50 && n <= 99) {
        payout = n;
        break;
      }
    }
    if (payout == null) payout = pickPayout(collectPayoutCandidates());

    const out = [];
    const list = Array.from(pairs);
    const primary =
      list[0] ||
      (wsActiveSymbol && looksLikeSymbol(wsActiveSymbol) ? wsActiveSymbol : null) ||
      (resolveActiveSymbol([]) ?? null);
    if (!primary || payout == null) return out;

    for (const symbol of list.length ? list : [primary]) {
      out.push(withCategory({
        symbol,
        payout,
        isOTC: /otc/i.test(symbol),
        timestamp: Date.now(),
      }));
    }
    return out;
  }

  function finalizeAssets(assets, activeSymbol) {
    const WS_PRICE_TTL_MS = 15_000;
    return assets
      .filter((a) => a.symbol && isValidPayout(a.payout))
      .map((a) => {
        const row = { ...a };
        const wsEntry = wsAssets.get(row.symbol);
        const wsFresh =
          wsEntry?.timestamp != null && Date.now() - wsEntry.timestamp <= WS_PRICE_TTL_MS;
        const wsPrice =
          wsEntry?.price != null ? sanitizeWsPrice(wsEntry.price, row.symbol, row.payout) : null;
        const keepPrice =
          row.symbol === activeSymbol || (wsPrice != null && wsFresh);
        if (!keepPrice) {
          delete row.price;
          return row;
        }
        const raw = row.price != null ? sanitizeWsPrice(row.price, row.symbol, row.payout) : wsPrice;
        if (raw != null) row.price = raw;
        else delete row.price;
        return row;
      });
  }

  function buildBatch() {
    const bySymbol = new Map();

    for (const a of wsAssets.values()) {
      if (!a?.symbol || typeof a.payout !== 'number') continue;
      const entry = withCategory({
        symbol: a.symbol,
        payout: a.payout,
        isOTC: a.isOTC ?? /otc/i.test(a.symbol),
        category: a.category,
        timestamp: a.timestamp ?? Date.now(),
      });
      const p = sanitizeWsPrice(a.price, a.symbol, a.payout);
      if (p != null) entry.price = p;
      bySymbol.set(a.symbol, entry);
    }

    const list = scrapeList();
    for (const a of list) {
      const prev = bySymbol.get(a.symbol);
      bySymbol.set(a.symbol, withCategory({
        ...prev,
        symbol: a.symbol,
        payout: a.payout ?? prev?.payout,
        isOTC: a.isOTC ?? prev?.isOTC ?? /otc/i.test(a.symbol),
        category: a.category ?? prev?.category,
        timestamp: a.timestamp ?? prev?.timestamp ?? Date.now(),
      }));
    }

    const activeSymbol = resolveActiveSymbol(list);
    let activePayload = null;

    if (activeSymbol) {
      const prev = bySymbol.get(activeSymbol);
      let payout =
        prev?.payout ??
        scrapeActive()?.payout ??
        pickPayout(collectPayoutCandidates());
      if (!isValidPayout(payout)) payout = 92;

      if (typeof payout === 'number') {
        activePayload = withCategory({
          symbol: activeSymbol,
          payout,
          isOTC: prev?.isOTC ?? /otc/i.test(activeSymbol),
          category: prev?.category,
          timestamp: Date.now(),
        });
        const price = resolveActivePrice(activeSymbol, payout);
        if (price != null) activePayload.price = price;
        bySymbol.set(activeSymbol, { ...prev, ...activePayload });
      }
    }

    let assets = Array.from(bySymbol.values());

    if (assets.length === 0) {
      assets = scrapeTradingFallback();
    }

    const resolvedActive =
      activeSymbol || wsActiveSymbol || assets.find((a) => a.price != null)?.symbol || assets[0]?.symbol || null;

    if (resolvedActive && activePayload?.price == null) {
      const p = resolveActivePrice(resolvedActive, activePayload?.payout ?? assets[0]?.payout);
      if (p != null) {
        const idx = assets.findIndex((a) => a.symbol === resolvedActive);
        if (idx >= 0) assets[idx] = { ...assets[idx], price: p };
        else if (activePayload) activePayload.price = p;
      }
    }

    assets = finalizeAssets(assets, resolvedActive);
    return { assets, activeSymbol: resolvedActive, activePayload };
  }

  function logPayload(assets, activeSymbol, activePayload) {
    const key = JSON.stringify(assets.map((a) => [a.symbol, a.price ?? null, a.payout]));
    if (key === lastLogKey) return;
    lastLogKey = key;

    console.log('[PRIME Bridge] detected symbol:', activeSymbol ?? '—');
    const wsCount = wsAssets.size;
    console.log('[PRIME Bridge] WS assets:', wsCount, '| DOM+merged:', assets.length);
    if (assets.length <= 1) {
      console.warn('[PRIME Bridge] Чекаємо updateAssets від Pocket Option WebSocket…');
    }
    if (activePayload && activePayload.price == null) {
      console.warn(
        '[PRIME Bridge] NO_PRICE for',
        activeSymbol,
        '— WS assets:',
        wsAssets.size,
        '| DOM scrape failed; reload extension if no "WebSocket hook installed" in console',
      );
    }
    console.log('[PRIME Bridge] final payload sent to backend:', assets);
  }

  function canSendToExtension() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function stopBridge(reason) {
    console.warn('[PRIME Bridge]', reason, '— натисніть F5 на сторінці Pocket Option.');
    contextDead = true;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  window.addEventListener('pageshow', () => {
    contextDead = false;
    if (!tickTimer) {
      tickTimer = setInterval(tick, 400);
      tick();
    }
  });

  function sendMessageSafe(payload) {
    if (!canSendToExtension()) return;
    try {
      chrome.runtime.sendMessage(payload, () => {
        const err = chrome.runtime.lastError?.message || '';
        if (err && /invalidated/i.test(err)) contextDead = true;
      });
    } catch {
      /* ignore transient extension errors */
    }
  }

  function tick() {
    if (contextDead && canSendToExtension()) {
      contextDead = false;
      if (!tickTimer) tickTimer = setInterval(tick, 400);
    }
    const domSym = readActiveSymbolFromDom();
    if (domSym && domSym !== wsActiveSymbol) {
      wsActiveSymbol = domSym;
    }
    const { assets, activeSymbol, activePayload } = buildBatch();
    const frame = window.top === window.self ? 'top' : 'iframe';
    const source = wsAssets.size > 0 ? 'ws+dom' : 'dom';

    if (assets.length > 0) logPayload(assets, activeSymbol, activePayload);

    sendMessageSafe({
      type: 'bridge-frame-data',
      host: location.host,
      pathname: location.pathname,
      isTradingPage: isTradingTerminal(),
      frame,
      source,
      activeSymbol,
      assets,
    });
  }

  tickTimer = setInterval(tick, 400);
  tick();

  let moTimer = null;
  function scheduleMoTick() {
    if (moTimer) return;
    moTimer = setTimeout(() => {
      moTimer = null;
      tick();
    }, 80);
  }

  function startPriceObserver() {
    const root =
      document.querySelector('.trading-panel') ||
      document.querySelector('.blocks-wrap') ||
      document.querySelector('[class*="terminal"]') ||
      document.body;
    if (!root) return;
    const mo = new MutationObserver(scheduleMoTick);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPriceObserver);
  } else {
    startPriceObserver();
  }

  function navigateToDemoIfNeeded() {
    const p = (location.pathname || '').toLowerCase();
    if (p.includes('quick-high-low') || p.includes('demo-quick')) return;
    const link = document.querySelector(
      'a[href*="demo-quick-high-low"], a[href*="quick-high-low"]',
    );
    if (link) {
      link.click();
      console.log('[PRIME Bridge] → demo trading (link click)');
      return;
    }
    if (/\/cabinet\/?$/.test(p) || /\/cabinet\/$/.test(p)) {
      location.href = `${location.origin}/en/cabinet/demo-quick-high-low/`;
      console.log('[PRIME Bridge] → demo trading (redirect)');
    }
  }

  function ensureAssetCatalogOpen() {
    const hasList = document.querySelector(
      '.assets-block__item, .alist__item, [class*="assets-block__item"], [class*="assets-list"] [class*="item"]',
    );
    if (hasList) return true;
    const openers = [
      '.current-symbol',
      '.current-symbol_cropped',
      '[class*="asset-select"]',
      '[class*="current-symbol"]',
      '[class*="pair-info"]',
      '.block--pair',
    ];
    for (const sel of openers) {
      const el = document.querySelector(sel);
      if (el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        if (typeof el.click === 'function') el.click();
        return true;
      }
    }
    return false;
  }

  /** PO sends updateAssets only for the open catalog tab — rotate tabs to collect forex/crypto/stocks. */
  const CATEGORY_TAB_RULES = [
    { re: /currencies\s+otc|валюти\s+otc|валюты\s+otc|forex\s+otc/i, label: 'forex_otc' },
    { re: /^currencies$|^валюти$|^валюты$|^forex$/i, label: 'forex' },
    { re: /crypto|крипт|криптовалют/i, label: 'crypto' },
    { re: /stocks|акці|акци/i, label: 'stocks' },
    { re: /commodit|товар/i, label: 'commodities' },
    { re: /indic|індекс|индекс/i, label: 'indices' },
  ];

  function getAssetPanelRoots() {
    const roots = new Set();
    document
      .querySelectorAll(
        '.assets-block, .alist, [class*="assets-block"], [class*="assets-list"], [class*="asset-select"]',
      )
      .forEach((el) => roots.add(el));
    for (const sel of LIST_ROW_SELECTORS) {
      document.querySelectorAll(sel).forEach((row) => {
        const panel = row.closest(
          '.assets-block, .alist, [class*="assets-block"], [class*="assets-list"], [class*="asset-select"]',
        );
        if (panel) roots.add(panel);
      });
    }
    return roots.size ? Array.from(roots) : [document.body];
  }

  function findCategoryTabs() {
    const found = [];
    const seen = new Set();
    const seenLabels = new Set();
    for (const root of getAssetPanelRoots()) {
      root.querySelectorAll('button, a, [role="tab"], li').forEach((el) => {
        if (seen.has(el)) return;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 32 || text.length < 3) return;
        for (const rule of CATEGORY_TAB_RULES) {
          if (rule.re.test(text) && !seenLabels.has(rule.label)) {
            seen.add(el);
            seenLabels.add(rule.label);
            found.push({ el, text, label: rule.label });
            break;
          }
        }
      });
    }
    return found;
  }

  let categoryTabIndex = 0;
  function rotateCategoryTab() {
    ensureAssetCatalogOpen();
    const tabs = findCategoryTabs();
    if (!tabs.length) return;
    const tab = tabs[categoryTabIndex % tabs.length];
    categoryTabIndex = (categoryTabIndex + 1) % tabs.length;
    try {
      tab.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      if (typeof tab.el.click === 'function') tab.el.click();
      console.log('[PRIME Bridge] category tab →', tab.text, `(${tab.label})`);
    } catch {
      /* ignore */
    }
  }

  function startCategoryRotation() {
    // Disabled: auto tab clicks broke PO WebSocket. Switch tabs manually on PO.
    setTimeout(() => ensureAssetCatalogOpen(), 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCategoryRotation);
  } else {
    startCategoryRotation();
  }

  function tryFocusSymbol(targetSymbol) {
    if (!targetSymbol) return false;
    const rows = new Set();
    for (const sel of LIST_ROW_SELECTORS) {
      document.querySelectorAll(sel).forEach((r) => rows.add(r));
    }
    document
      .querySelectorAll('.assets-block, .alist, [class*="assets-block"], [class*="assets-list"]')
      .forEach((container) => {
        container.querySelectorAll('[class*="item"], li, a, button').forEach((r) => rows.add(r));
      });
    for (const row of rows) {
      const sym = findSymbolInRow(row);
      if (sym && symbolsMatch(sym, targetSymbol)) {
        row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        if (typeof row.click === 'function') row.click();
        console.log('[PRIME Bridge] focus click →', sym);
        return true;
      }
    }
    return false;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'bridge-focus' && msg.symbol) {
      tryFocusSymbol(msg.symbol);
      return false;
    }
    if (msg && msg.type === 'bridge-probe') {
      const list = scrapeList();
      const batch = buildBatch();
      sendResponse({
        active: batch.activePayload ?? scrapeActive(),
        listCount: list.length,
        assets: batch.assets,
      });
    }
    return true;
  });

  console.log('[PRIME Bridge] content script active on', location.host);
})();
