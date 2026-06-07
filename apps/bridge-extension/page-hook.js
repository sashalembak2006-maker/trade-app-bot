/* eslint-disable */
/**
 * PAGE context — Pocket Option WebSocket / Socket.IO hooks.
 * updateStream binary: 451-["updateStream",{_placeholder}] + next ArrayBuffer/Blob frame.
 */
(function () {
  if (window.__PRIME_BRIDGE_HOOK__) return;
  window.__PRIME_BRIDGE_HOOK__ = true;

  const BIN = () => window.__PRIME_BRIDGE_BINARY__;
  const MAX_SAMPLES = 80;

  let activeAsset = null;
  let streamTickCount = 0;
  let sampleId = 0;
  const streamSamples = [];
  const binaryAssemblyQueue = [];

  const wsState = new WeakMap();
  /** Orphan binaries that arrived before/without 451 header (max 12, 3s TTL). */
  const recentOrphanBinaries = [];
  const wsStats = { string: 0, binary: 0, placeholders: 0, decoded: 0, orphans: 0 };
  window.__PRIME_BRIDGE_WS_STATS__ = wsStats;

  function post(type, payload) {
    window.postMessage({ source: 'prime-bridge-po', type, ...payload }, '*');
  }

  function getWsState(ws) {
    if (!wsState.has(ws)) {
      wsState.set(ws, { url: String(ws.url || ''), isMarket: /po\.market/i.test(ws.url || '') });
    }
    return wsState.get(ws);
  }

  function poSymbolToDisplay(sym) {
    if (!sym) return null;
    let s = String(sym).replace(/^#/, '');
    const isOtc = /_otc$/i.test(s);
    s = s.replace(/_otc$/i, '');
    if (/^[A-Z]{6}$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}${isOtc ? ' OTC' : ''}`;
    if (/^[A-Z]{3}\/[A-Z]{3}$/i.test(s)) return s.toUpperCase() + (isOtc ? ' OTC' : '');
    return s.replace(/_/g, ' ') + (isOtc && !/otc/i.test(s) ? ' OTC' : '');
  }

  function toArrayBuffer(raw) {
    if (raw instanceof ArrayBuffer) return raw;
    if (ArrayBuffer.isView(raw)) {
      return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    }
    return null;
  }

  function isPlaceholder(v) {
    return v != null && typeof v === 'object' && v._placeholder === true;
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
    const plain = s.replace(/\s+OTC$/, '').trim();
    if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(plain) && !/^[A-Z]{3}\/[A-Z]{3}$/.test(plain)) {
      return { min: 0.5, max: 100_000 };
    }
    if (/JPY/.test(s)) return { min: 40, max: 500 };
    if (/CLP|COP|IDR|VND|KRW|HUF/.test(s)) return { min: 0.01, max: 100_000 };
    if (/INR|TRY|RUB|CNH|BRL|MXN/.test(s)) return { min: 0.01, max: 5_000 };
    return { min: 0.000_01, max: 25 };
  }

  function decimalPlaces(n) {
    const s = n.toFixed(10).replace(/0+$/, '');
    return (s.split('.')[1] || '').length;
  }

  function isForexStreamPrice(price, symbol) {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price >= 1e7) return false;
    if (price >= 1e8 && price <= 2.2e12) return false;
    const { min, max } = priceRangeForSymbol(symbol || activeAsset);
    if (price < min || price > max) return false;
    if (price >= 50 && price <= 99 && max <= 25 && decimalPlaces(price) <= 1) return false;
    return decimalPlaces(price) >= 2 || (price > 0.01 && price < 500);
  }

  function parseAssetRow(row) {
    if (!Array.isArray(row) || row.length < 6) return null;
    const raw = row[1];
    const payout = row[5];
    if (typeof raw !== 'string' || typeof payout !== 'number' || payout < 1 || payout > 100) return null;
    const isOtc = row[14] === true || /_otc/i.test(raw);
    const symbol = poSymbolToDisplay(raw);
    if (!symbol) return null;
    let catalogPrice = null;
    for (let i = 0; i < row.length; i++) {
      if (i === 5) continue;
      const v = row[i];
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
      if (v === payout || (v >= 50 && v <= 99 && Math.abs(v - Math.round(v)) < 0.001)) continue;
      const p = sanitizeWsPrice(v, symbol, payout);
      if (p != null) {
        catalogPrice = p;
        break;
      }
    }
    return {
      symbol,
      payout,
      isOTC: isOtc,
      category: resolveBridgeCategory(symbol, isOtc),
      timestamp: Date.now(),
      ...(catalogPrice != null ? { lastKnownPrice: catalogPrice } : {}),
    };
  }

  function parseUpdateAssets(data) {
    if (!Array.isArray(data)) return [];
    const out = [];
    for (const row of data) {
      const a = parseAssetRow(row);
      if (a) out.push(a);
    }
    return out;
  }

  function extractTimestampMs(value) {
    if (typeof value === 'number' && value > 1e11 && value < 2e13) return Math.round(value);
    if (typeof value === 'number' && value > 1e8 && value < 2e11) return Math.round(value * 1000);
    return null;
  }

  function tickFromTuple(tuple, fallbackSymbol) {
    if (!Array.isArray(tuple) || tuple.length < 3 || typeof tuple[0] !== 'string') return null;
    const symbol = poSymbolToDisplay(tuple[0]) || fallbackSymbol;
    const tsRaw = tuple[1];
    const price = tuple[2];
    if (typeof price !== 'number' || !Number.isFinite(price)) return null;
    if (!isForexStreamPrice(price, symbol || fallbackSymbol)) return null;
    const timestamp =
      typeof tsRaw === 'number' && Number.isFinite(tsRaw)
        ? tsRaw < 1e12
          ? Math.round(tsRaw * 1000)
          : Math.round(tsRaw)
        : Date.now();
    return { symbol, price, timestamp };
  }

  function parseStreamTicks(data, contextSymbol, picked, inspection) {
    const ctx = contextSymbol || activeAsset;
    const out = [];
    const seen = new Set();

    const pushTick = (tick) => {
      if (!tick?.symbol || !isForexStreamPrice(tick.price, tick.symbol)) return;
      const key = tick.symbol + ':' + tick.price + ':' + tick.timestamp;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(tick);
    };

    const binApi = BIN();
    const asJson = inspection?.asJson ?? (Array.isArray(data) || (data && typeof data === 'object') ? data : null);
    if (asJson != null && binApi?.extractTicksFromAsJson) {
      for (const raw of binApi.extractTicksFromAsJson(asJson)) {
        pushTick({
          symbol: poSymbolToDisplay(raw.symbol) || ctx,
          price: raw.price,
          timestamp: raw.timestamp ?? Date.now(),
        });
      }
      if (out.length) return out;
    }

    if (picked?.price != null && picked.source === 'asJson') {
      pushTick({
        symbol: poSymbolToDisplay(picked.symbol) || ctx,
        price: picked.price,
        timestamp: picked.timestamp ?? Date.now(),
      });
      if (out.length) return out;
    }

    if (Array.isArray(data)) {
      if (data.length >= 3 && typeof data[0] === 'string') {
        const single = tickFromTuple(data, ctx);
        if (single) pushTick(single);
        if (out.length) return out;
      }
      for (const item of data) {
        const tick = tickFromTuple(item, ctx);
        if (tick) pushTick(tick);
      }
      if (out.length) return out;

      const nums = data.filter((x) => typeof x === 'number');
      const ts = nums.find((n) => n > 1e11 && n < 2e13);
      const prices = nums.filter((n) => isForexStreamPrice(n, ctx) && n !== ts);
      if (prices.length) {
        pushTick({ symbol: ctx, price: prices[0], timestamp: ts ?? Date.now() });
        return out;
      }
      if (data.length >= 2 && typeof data[0] === 'number' && typeof data[1] === 'number') {
        const a = data[0];
        const b = data[1];
        if (a > 1e11 && isForexStreamPrice(b, ctx)) {
          pushTick({ symbol: ctx, price: b, timestamp: a });
        } else if (b > 1e11 && isForexStreamPrice(a, ctx)) {
          pushTick({ symbol: ctx, price: a, timestamp: b });
        } else if (isForexStreamPrice(b, ctx)) {
          pushTick({ symbol: ctx, price: b, timestamp: Date.now() });
        } else if (isForexStreamPrice(a, ctx)) {
          pushTick({ symbol: ctx, price: a, timestamp: Date.now() });
        }
        if (out.length) return out;
      }
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const price = data.price ?? data.value ?? data.close ?? data.rate;
      if (typeof price === 'number' && isForexStreamPrice(price, ctx)) {
        pushTick({
          symbol: ctx,
          price,
          timestamp: extractTimestampMs(data.time ?? data.timestamp) ?? Date.now(),
        });
        if (out.length) return out;
      }
    }

    if (picked?.price != null && isForexStreamPrice(picked.price, ctx)) {
      pushTick({
        symbol: poSymbolToDisplay(picked.symbol) || ctx,
        price: picked.price,
        timestamp: picked.timestamp ?? Date.now(),
      });
    }

    return out;
  }

  function parseStreamTick(data, contextSymbol, picked, inspection) {
    const ticks = parseStreamTicks(data, contextSymbol, picked, inspection);
    return ticks[0] ?? null;
  }

  function saveStreamSample(entry) {
    sampleId += 1;
    const row = { id: sampleId, at: new Date().toISOString(), ...entry };
    streamSamples.push(row);
    if (streamSamples.length > MAX_SAMPLES) streamSamples.shift();
    post('stream-sample', { sample: row });
    return row;
  }

  function emitStreamTick(tick) {
    if (!tick || !isForexStreamPrice(tick.price, tick.symbol || activeAsset)) return false;
    if (tick.symbol) activeAsset = tick.symbol;
    streamTickCount += 1;
    if (streamTickCount <= 8 || streamTickCount % 40 === 0) {
      console.log('[PRIME Bridge] LIVE', tick.symbol, tick.price);
    }
    post('stream', tick);
    return true;
  }

  function decodeBinaryAttachment(buf, debugRow) {
    const binApi = BIN();
    const ab = toArrayBuffer(buf);
    const inspection =
      debugRow?.inspection ??
      (ab && binApi?.inspectBinary ? binApi.inspectBinary(new Uint8Array(ab), {}) : null);

    if (inspection?.asJson != null && binApi?.extractTicksFromAsJson) {
      const ticks = binApi.extractTicksFromAsJson(inspection.asJson);
      if (ticks.length === 1) {
        const t = ticks[0];
        return [t.symbol, t.timestamp / 1000, t.price];
      }
      if (ticks.length > 1) {
        return ticks.map((t) => [t.symbol, t.timestamp / 1000, t.price]);
      }
      return inspection.asJson;
    }

    const picked = debugRow?.picked ?? (inspection ? binApi?.pickBestPrice(inspection) : null);
    if (picked?.price != null && picked.source === 'asJson') {
      return [picked.symbol, (picked.timestamp ?? Date.now()) / 1000, picked.price];
    }

    if (!ab) return inspection ?? null;
    const bytes = new Uint8Array(ab);
    const view = new DataView(ab);
    if (bytes.length >= 16) {
      const a = view.getFloat64(0, true);
      const b = view.getFloat64(8, true);
      return [a, b];
    }
    if (bytes.length >= 8) return view.getFloat64(0, true);
    return null;
  }

  function reconstructWithBinaries(node, binaries, debugRows) {
    if (isPlaceholder(node)) {
      const idx = typeof node.num === 'number' ? node.num : 0;
      const buf = binaries[idx];
      return buf ? decodeBinaryAttachment(buf, debugRows[idx]) : node;
    }
    if (Array.isArray(node)) return node.map((x) => reconstructWithBinaries(x, binaries, debugRows));
    if (node && typeof node === 'object') {
      const out = {};
      for (const k of Object.keys(node)) out[k] = reconstructWithBinaries(node[k], binaries, debugRows);
      return out;
    }
    return node;
  }

  function parseSocketIoTextFrame(text) {
    if (!text || typeof text !== 'string') return null;
    if (text === '2' || text === '3') return { kind: 'ping', raw: text };
    if (text[0] !== '4') return null;
    const packetType = text[1];
    if (packetType !== '2' && packetType !== '5' && packetType !== '6') return { kind: 'unknown', raw: text };

    let i = 2;
    let attachmentCount = 0;
    if (packetType === '5' || packetType === '6') {
      while (i < text.length && text[i] >= '0' && text[i] <= '9') {
        attachmentCount = attachmentCount * 10 + (text.charCodeAt(i) - 48);
        i++;
      }
      if (text[i] !== '-') return { kind: 'unknown', raw: text };
      i++;
    }
    const jsonStart = text.indexOf('[', i);
    if (jsonStart < 0) return { kind: 'unknown', raw: text };
    let payload;
    try {
      payload = JSON.parse(text.slice(jsonStart));
    } catch {
      return { kind: 'parse_error', raw: text };
    }
    return {
      kind: packetType === '5' ? 'binary_event' : packetType === '6' ? 'binary_ack' : 'event',
      attachmentCount,
      payload,
      frameText: text,
    };
  }

  function pruneOrphans() {
    const now = Date.now();
    while (recentOrphanBinaries.length && now - recentOrphanBinaries[0].at > 3000) {
      recentOrphanBinaries.shift();
    }
  }

  function pushOrphanBinary(ab, ws) {
    pruneOrphans();
    recentOrphanBinaries.push({ ab, ws, at: Date.now() });
    while (recentOrphanBinaries.length > 12) recentOrphanBinaries.shift();
    wsStats.orphans += 1;
  }

  function takeOrphanBinary(ws) {
    pruneOrphans();
    const idx = recentOrphanBinaries.findIndex((o) => !ws || o.ws === ws);
    if (idx < 0) return null;
    return recentOrphanBinaries.splice(idx, 1)[0].ab;
  }

  function queueBinaryAssembly(frame) {
    const entry = {
      attachmentCount: frame.attachmentCount,
      payload: frame.payload,
      frameText: frame.frameText,
      received: [],
      debugRows: [],
      at: Date.now(),
    };
    binaryAssemblyQueue.push(entry);
    wsStats.placeholders += 1;
    while (entry.received.length < entry.attachmentCount) {
      const orphan = takeOrphanBinary(null);
      if (!orphan) break;
      entry.received.push(orphan);
      console.log('[PRIME Bridge] matched orphan binary → 451 queue');
    }
    if (entry.received.length >= entry.attachmentCount) {
      binaryAssemblyQueue.shift();
      finishBinaryAssembly(entry);
    }
  }

  function finishBinaryAssembly(pending) {
    const eventName = Array.isArray(pending.payload) ? pending.payload[0] : null;
    const args = Array.isArray(pending.payload) ? pending.payload.slice(1) : [pending.payload];
    const reconstructedArgs = args.map((arg) =>
      reconstructWithBinaries(arg, pending.received, pending.debugRows),
    );
    const reconstructed = reconstructedArgs.length === 1 ? reconstructedArgs[0] : reconstructedArgs;

    if (eventName !== 'updateStream') {
      console.log('[PRIME Bridge] binary event', eventName, reconstructed);
      return;
    }

    const binApi = BIN();
    const inspection =
      pending.received[0] && binApi?.inspectBinary
        ? binApi.inspectBinary(new Uint8Array(pending.received[0]), {})
        : null;
    const picked = inspection ? binApi.pickBestPrice(inspection) : null;
    const ticks = parseStreamTicks(reconstructed, activeAsset, picked, inspection);
    const sample = saveStreamSample({
      event: 'updateStream',
      frameText: pending.frameText,
      attachmentCount: pending.attachmentCount,
      reconstructed,
      binary: inspection,
      picked,
      ticks,
      tick: ticks[0] ?? null,
    });
    console.log('[PRIME Bridge] updateStream OK', sample);
    for (const tick of ticks) emitStreamTick(tick);
  }

  function runBinaryDebugAsync(raw, meta) {
    const binApi = BIN();
    if (!binApi) return;
    Promise.resolve(
      binApi.processBinaryFrame(raw, meta),
    ).then((debugRow) => {
      if (debugRow) post('binary-debug', { debug: debugRow, all: binApi.debugLog?.slice(-50) });
    }).catch(() => {});
  }

  function ingestBinaryAttachmentSync(raw, ws, wsMeta) {
    wsStats.binary += 1;
    const ab = toArrayBuffer(raw);
    if (!ab) {
      if (raw instanceof Blob) {
        raw.arrayBuffer().then((buf) => ingestBinaryAttachmentSync(buf, ws, wsMeta)).catch(() => {});
      }
      return;
    }

    console.log('[PRIME Bridge WS] typeof data: ArrayBuffer', ab.byteLength, 'B', wsMeta?.url?.slice(0, 50));

    runBinaryDebugAsync(raw, {
      role: wsMeta?.pending451 ? 'updateStream-attachment' : 'orphan',
      wsUrl: wsMeta?.url,
      frameText: wsMeta?.pending451?.frameText,
    });

    const pending = binaryAssemblyQueue[0];
    if (!pending) {
      pushOrphanBinary(ab, ws);
      const binApi = BIN();
      const inspection = binApi?.inspectBinary?.(new Uint8Array(ab), {});
      const picked = inspection ? binApi.pickBestPrice(inspection) : null;
      const ticks = parseStreamTicks(null, activeAsset, picked, inspection);
      for (const tick of ticks) emitStreamTick(tick);
      return;
    }

    pending.received.push(ab);
    if (pending.received.length < pending.attachmentCount) return;

    binaryAssemblyQueue.shift();
    finishBinaryAssembly(pending);
    wsStats.decoded += 1;
  }

  function handleSocketIoFrame(frame, wsMeta) {
    if (!frame) return;

    if ((frame.kind === 'binary_event' || frame.kind === 'binary_ack') && frame.attachmentCount > 0) {
      queueBinaryAssembly(frame);
      if (wsMeta) wsMeta.pending451 = { frameText: frame.frameText, at: Date.now() };
      if (Array.isArray(frame.payload) && frame.payload[0] === 'updateStream') {
        console.log('[PRIME Bridge] 451 placeholder → чекаємо binary', frame.frameText);
      }
      return;
    }

    if (frame.kind !== 'event' && frame.kind !== 'binary_event') return;
    const arr = frame.payload;
    if (!Array.isArray(arr) || !arr.length) return;

    if (arr[0] === 'updateAssets' && arr[1]) {
      const assets = parseUpdateAssets(arr[1]);
      if (assets.length) post('assets', { assets, count: assets.length });
      return;
    }

    if (arr[0] === 'updateStream') {
      if (arr[1] != null && !isPlaceholder(arr[1])) {
        const tick = parseStreamTick(arr[1], activeAsset);
        if (tick) emitStreamTick(tick);
      } else if (arr[1] != null && isPlaceholder(arr[1])) {
        const need = frame.attachmentCount > 0 ? frame.attachmentCount : 1;
        queueBinaryAssembly({
          attachmentCount: need,
          payload: frame.payload,
          frameText: frame.frameText,
        });
        if (wsMeta) wsMeta.pending451 = { frameText: frame.frameText, at: Date.now() };
      }
      return;
    }

    if (arr[0] === 'changeSymbol' && arr[1]?.asset) {
      activeAsset = poSymbolToDisplay(String(arr[1].asset));
      post('active', { symbol: activeAsset });
    }
  }

  function handleTextPayload(text, wsMeta) {
    if (!text || text === '2' || text === '3') return;
    const parsed = parseSocketIoTextFrame(text);
    if (parsed && parsed.kind !== 'unknown' && parsed.kind !== 'parse_error') {
      handleSocketIoFrame(parsed, wsMeta);
      return;
    }
    const start = text.indexOf('[');
    if (start >= 0) {
      try {
        const arr = JSON.parse(text.slice(start));
        if (Array.isArray(arr)) {
          handleSocketIoFrame({ kind: 'event', attachmentCount: 0, payload: arr, frameText: text }, wsMeta);
        }
      } catch {
        /* ignore */
      }
    }
  }

  const lastTap = new WeakMap();

  function tapSignature(raw) {
    const dtype = BIN()?.dataTypeOf(raw) ?? typeof raw;
    if (raw instanceof ArrayBuffer) return dtype + ':' + raw.byteLength;
    if (ArrayBuffer.isView(raw)) return dtype + ':' + raw.byteLength;
    if (raw instanceof Blob) return dtype + ':' + raw.size;
    if (typeof raw === 'string') return dtype + ':' + raw.length + ':' + raw.slice(0, 24);
    return dtype;
  }

  function tapWsMessage(ws, raw) {
    const sig = tapSignature(raw);
    const prev = lastTap.get(ws);
    const now = Date.now();
    if (prev && prev.sig === sig && now - prev.at < 15) return;
    lastTap.set(ws, { sig, at: now });

    const st = getWsState(ws);
    const isBinary =
      raw instanceof ArrayBuffer || raw instanceof Blob || ArrayBuffer.isView(raw);

    if (isBinary) {
      ingestBinaryAttachmentSync(raw, ws, st);
      return;
    }

    const text = typeof raw === 'string' ? raw : String(raw);
    if (text === '2' || text === '3') return;

    wsStats.string += 1;
    if (st.isMarket && (text.startsWith('451') || text.includes('updateStream'))) {
      console.log('[PRIME Bridge WS] typeof data: string', text.slice(0, 80));
    }

    handleTextPayload(text, st);
  }

  function wrapWsInstance(ws) {
    if (ws.__primeWrapped) return ws;
    ws.__primeWrapped = true;
    const st = getWsState(ws);
    if (st.isMarket) console.log('[PRIME Bridge] WS wrapped', st.url);
    return ws;
  }

  let marketIoSocket = null;

  function requestPoChangeSymbol(poAsset, displaySymbol) {
    if (!poAsset) return false;
    if (marketIoSocket?.emit) {
      marketIoSocket.emit('changeSymbol', { asset: poAsset });
      if (displaySymbol) {
        activeAsset = displaySymbol;
        post('active', { symbol: displaySymbol });
      }
      return true;
    }
    return false;
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || ev.data?.source !== 'prime-bridge-cmd') return;
    if (ev.data.type === 'changeSymbol') {
      requestPoChangeSymbol(ev.data.poAsset, ev.data.displaySymbol ?? null);
    }
  });

  function bindSocketEvents(socket, uri) {
    if (!socket || socket.__primeBound) return;
    socket.__primeBound = true;
    if (/po\.market/i.test(uri || '')) {
      marketIoSocket = socket;
      console.log('[PRIME Bridge] Socket.IO market:', uri);
    }
    const on = socket.on?.bind(socket);
    if (!on) return;
    on('updateAssets', (data) => {
      const assets = parseUpdateAssets(data);
      if (assets.length) post('assets', { assets, count: assets.length });
    });
    on('updateStream', (data) => {
      if (!isPlaceholder(data)) {
        const ticks = parseStreamTicks(data, activeAsset);
        for (const tick of ticks) emitStreamTick(tick);
      }
    });
    on('changeSymbol', (data) => {
      if (data?.asset) {
        activeAsset = poSymbolToDisplay(String(data.asset));
        post('active', { symbol: activeAsset });
      }
    });
  }

  function wrapIoFactory(origIo) {
    function wrapped(uri, opts) {
      const socket = origIo(uri, opts);
      bindSocketEvents(socket, uri);
      return socket;
    }
    Object.assign(wrapped, origIo);
    wrapped.__primeWrapped = true;
    return wrapped;
  }

  function installIoTrap() {
    try {
      let current = window.io;
      if (current && !current.__primeWrapped) current = wrapIoFactory(current);
      Object.defineProperty(window, 'io', {
        configurable: true,
        enumerable: true,
        get() {
          return current;
        },
        set(fn) {
          current = typeof fn === 'function' && !fn.__primeWrapped ? wrapIoFactory(fn) : fn;
        },
      });
      window.io = current;
    } catch (e) {
      console.warn('[PRIME Bridge] io trap', e);
    }
  }

  const Orig = window.WebSocket;

  const origOnMessageDesc = Object.getOwnPropertyDescriptor(Orig.prototype, 'onmessage');
  if (origOnMessageDesc) {
    Object.defineProperty(Orig.prototype, 'onmessage', {
      configurable: true,
      enumerable: true,
      get() {
        return this.__primeUserOnMessage || null;
      },
      set(fn) {
        this.__primeUserOnMessage = fn;
        const self = this;
        const wrapped = function (ev) {
          try {
            tapWsMessage(self, ev.data);
          } catch {
            /* ignore */
          }
          if (typeof fn === 'function') return fn.call(self, ev);
        };
        if (origOnMessageDesc.set) origOnMessageDesc.set.call(this, wrapped);
        else this.__primeWrappedOnMessage = wrapped;
      },
    });
  }

  const origAEL = Orig.prototype.addEventListener;
  Orig.prototype.addEventListener = function (type, listener, options) {
    if (type === 'message') {
      const self = this;
      const wrapped = function (ev) {
        try {
          tapWsMessage(self, ev.data);
        } catch {
          /* ignore */
        }
        if (typeof listener === 'function') return listener.call(self, ev);
        if (listener?.handleEvent) return listener.handleEvent(ev);
      };
      return origAEL.call(this, type, wrapped, options);
    }
    return origAEL.call(this, type, listener, options);
  };

  const origSend = Orig.prototype.send;
  Orig.prototype.send = function (...args) {
    wrapWsInstance(this);
    try {
      const text = typeof args[0] === 'string' ? args[0] : '';
      if (text.startsWith('42["auth"') || /42\["auth"/.test(text)) {
        post('po-auth', { frame: text.slice(0, 4000), at: Date.now() });
      }
    } catch {
      /* ignore */
    }
    return origSend.apply(this, args);
  };

  window.WebSocket = function PrimeWs(url, protocols) {
    const ws = protocols !== undefined ? new Orig(url, protocols) : new Orig(url);
    return wrapWsInstance(ws);
  };
  window.WebSocket.prototype = Orig.prototype;
  Object.assign(window.WebSocket, {
    CONNECTING: Orig.CONNECTING,
    OPEN: Orig.OPEN,
    CLOSING: Orig.CLOSING,
    CLOSED: Orig.CLOSED,
  });

  installIoTrap();

  window.__PRIME_BRIDGE_STREAM_SAMPLES__ = streamSamples;
  window.__PRIME_BRIDGE_DUMP_STREAM_SAMPLES__ = (n) => console.table(streamSamples.slice(-(n || 20)));
  window.__PRIME_BRIDGE_EXPORT_STREAM_SAMPLES__ = () => JSON.stringify(streamSamples, null, 2);

  console.log(
    '[PRIME Bridge] v1.6.5 OK | stats: __PRIME_BRIDGE_WS_STATS__ | debug: __PRIME_BRIDGE_BINARY_DEBUG__',
  );
})();
