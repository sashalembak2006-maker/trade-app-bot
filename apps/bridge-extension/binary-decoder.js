/* eslint-disable */
/** Pocket Option Socket.IO binary frame inspector + decoder (page context). */
(function () {
  if (window.__PRIME_BRIDGE_BINARY__) return;

  const MAX_DEBUG = 50;
  let debugId = 0;
  const debugLog = [];

  window.__PRIME_BRIDGE_BINARY_DEBUG__ = debugLog;

  function dataTypeOf(raw) {
    if (raw == null) return 'null';
    if (raw instanceof ArrayBuffer) return 'ArrayBuffer';
    if (ArrayBuffer.isView(raw)) return 'TypedArray:' + raw.constructor.name;
    if (raw instanceof Blob) return 'Blob';
    return typeof raw;
  }

  function toUint8(raw) {
    if (raw instanceof Uint8Array) return raw;
    if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
    if (ArrayBuffer.isView(raw)) {
      return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    }
    return null;
  }

  async function toUint8Async(raw) {
    const direct = toUint8(raw);
    if (direct) return direct;
    if (raw instanceof Blob) return new Uint8Array(await raw.arrayBuffer());
    return null;
  }

  function bytesToHex(bytes, max) {
    const n = Math.min(bytes.length, max ?? 100);
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(bytes[i].toString(16).padStart(2, '0'));
    const hex = parts.join(' ');
    return bytes.length > n ? hex + ' …(' + bytes.length + ' B)' : hex;
  }

  function decimalPlaces(n) {
    if (!Number.isFinite(n)) return 0;
    const s = n.toFixed(12).replace(/0+$/, '');
    return (s.split('.')[1] || '').length;
  }

  function readVisiblePlatformPrice() {
    try {
      const sels = [
        '.value__val-start',
        '.value__val.value__val-start',
        '.block--pair .value__val-start',
        '.chart-quote__value',
      ];
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (!el?.textContent) continue;
        const n = parseFloat(el.textContent.replace(/[^\d.,-]/g, '').replace(',', '.'));
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function isPriceLike(n) {
    if (!Number.isFinite(n) || n <= 0 || n >= 1e7) return false;
    if (n >= 50 && n <= 100 && decimalPlaces(n) <= 1) return false;
    if (n > 1e9) return false;
    return decimalPlaces(n) >= 2 || (n > 1 && n < 500);
  }

  function nearPrice(n, hint) {
    if (!hint || !isPriceLike(n)) return false;
    const diff = Math.abs(n - hint);
    return diff < 0.0005 || diff / hint < 0.002;
  }

  /** Minimal MessagePack decode (fix types + float64 + arrays). */
  function tryMsgPack(bytes) {
    const out = { ok: false, value: null, error: null };
    try {
      const r = mpDecode(bytes, 0);
      out.ok = true;
      out.value = r.value;
      out.bytesRead = r.next;
    } catch (e) {
      out.error = e instanceof Error ? e.message : String(e);
    }
    return out;
  }

  function mpDecode(bytes, pos) {
    if (pos >= bytes.length) throw new Error('msgpack: eof');
    const tag = bytes[pos++];
    if (tag <= 0x7f) return { value: tag, next: pos };
    if (tag >= 0xe0) return { value: tag - 256, next: pos };
    if (tag === 0xc0) return { value: null, next: pos };
    if (tag === 0xc2) return { value: false, next: pos };
    if (tag === 0xc3) return { value: true, next: pos };
    if (tag >= 0xa0 && tag <= 0xbf) {
      const len = tag - 0xa0;
      const s = new TextDecoder().decode(bytes.subarray(pos, pos + len));
      return { value: s, next: pos + len };
    }
    if (tag >= 0x90 && tag <= 0x9f) {
      const len = tag - 0x90;
      const arr = [];
      let p = pos;
      for (let i = 0; i < len; i++) {
        const r = mpDecode(bytes, p);
        arr.push(r.value);
        p = r.next;
      }
      return { value: arr, next: p };
    }
    if (tag === 0xdc) {
      const len = (bytes[pos] << 8) | bytes[pos + 1];
      pos += 2;
      const arr = [];
      let p = pos;
      for (let i = 0; i < len; i++) {
        const r = mpDecode(bytes, p);
        arr.push(r.value);
        p = r.next;
      }
      return { value: arr, next: p };
    }
    if (tag === 0xcc) return { value: bytes[pos], next: pos + 1 };
    if (tag === 0xcd) {
      return { value: (bytes[pos] << 8) | bytes[pos + 1], next: pos + 2 };
    }
    if (tag === 0xce) {
      const v =
        (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
      return { value: v >>> 0, next: pos + 4 };
    }
    if (tag === 0xcf) {
      let v = 0n;
      for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(bytes[pos + i]);
      return { value: Number(v), next: pos + 8 };
    }
    if (tag === 0xd0) return { value: (bytes[pos] << 24) >> 24, next: pos + 1 };
    if (tag === 0xd1) {
      const v = (bytes[pos] << 8) | bytes[pos + 1];
      return { value: (v << 16) >> 16, next: pos + 2 };
    }
    if (tag === 0xd2) {
      const v = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
      return { value: v | 0, next: pos + 4 };
    }
    if (tag === 0xca) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 4);
      return { value: view.getFloat32(0, false), next: pos + 4 };
    }
    if (tag === 0xcb) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 8);
      return { value: view.getFloat64(0, false), next: pos + 8 };
    }
    if (tag === 0xde) {
      const len = (bytes[pos] << 8) | bytes[pos + 1];
      pos += 2;
      const obj = {};
      let p = pos;
      for (let i = 0; i < len; i++) {
        const k = mpDecode(bytes, p);
        p = k.next;
        const v = mpDecode(bytes, p);
        p = v.next;
        obj[k.value] = v.value;
      }
      return { value: obj, next: p };
    }
    throw new Error('msgpack: unsupported 0x' + tag.toString(16));
  }

  function scanNumeric(bytes, visibleHint) {
    const float64le = [];
    const float64be = [];
    const float32le = [];
    const float32be = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const maxOff = Math.min(bytes.length, 128);

    for (let off = 0; off + 8 <= maxOff; off++) {
      const le = view.getFloat64(off, true);
      const be = view.getFloat64(off, false);
      if (Number.isFinite(le)) float64le.push({ off, v: le });
      if (Number.isFinite(be)) float64be.push({ off, v: be });
    }
    for (let off = 0; off + 4 <= maxOff; off++) {
      const le = view.getFloat32(off, true);
      const be = view.getFloat32(off, false);
      if (Number.isFinite(le)) float32le.push({ off, v: le });
      if (Number.isFinite(be)) float32be.push({ off, v: be });
    }

    const allNums = [...float64le, ...float64be, ...float32le, ...float32be].map((x) => x.v);
    const priceLike = [...new Set(allNums.filter(isPriceLike))].slice(0, 20);
    const nearVisible = visibleHint
      ? [...new Set(allNums.filter((n) => nearPrice(n, visibleHint)))].slice(0, 10)
      : [];

    return { float64le, float64be, float32le, float32be, priceLike, nearVisible };
  }

  function inspectBinary(bytes, meta) {
    const visibleHint = readVisiblePlatformPrice();
    let asUtf8 = null;
    let asJson = null;
    try {
      asUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const t = asUtf8.trim();
      if (t.startsWith('[') || t.startsWith('{')) {
        try {
          asJson = JSON.parse(t);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }

    const msgpack = tryMsgPack(bytes);
    const numeric = scanNumeric(bytes, visibleHint);

    return {
      ...meta,
      byteLength: bytes.length,
      first100hex: bytesToHex(bytes, 100),
      asUtf8: asUtf8 && asUtf8.length > 180 ? asUtf8.slice(0, 180) + '…' : asUtf8,
      asJson,
      msgpack,
      visiblePlatformPrice: visibleHint,
      ...numeric,
    };
  }

  function timestampToMs(ts) {
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return Date.now();
    return ts < 1e12 ? Math.round(ts * 1000) : Math.round(ts);
  }

  function parseTickTuple(tuple) {
    if (!Array.isArray(tuple) || tuple.length < 3) return null;
    const symbol = tuple[0];
    const ts = tuple[1];
    const price = tuple[2];
    if (typeof symbol !== 'string' || !symbol) return null;
    if (typeof price !== 'number' || !Number.isFinite(price) || !isPriceLike(price)) return null;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
    return { symbol, price, timestamp: timestampToMs(ts), source: 'asJson' };
  }

  /** Extract live ticks from decoded JSON (flat, nested batch, or history object). */
  function extractTicksFromAsJson(asJson) {
    if (asJson == null) return [];

    if (Array.isArray(asJson)) {
      if (asJson.length >= 3 && typeof asJson[0] === 'string') {
        const flat = parseTickTuple(asJson);
        return flat ? [flat] : [];
      }
      const ticks = [];
      for (const item of asJson) {
        if (!Array.isArray(item)) continue;
        if (item.length >= 3 && typeof item[0] === 'string') {
          const t = parseTickTuple(item);
          if (t) ticks.push(t);
        } else {
          for (const inner of item) {
            const t = parseTickTuple(inner);
            if (t) ticks.push(t);
          }
        }
      }
      return ticks;
    }

    if (typeof asJson === 'object') {
      const asset = asJson.asset ?? asJson.symbol;
      const data = asJson.data;
      if (typeof asset === 'string' && Array.isArray(data) && data.length) {
        const last = data[data.length - 1];
        if (Array.isArray(last) && last.length >= 2 && typeof last[0] === 'number') {
          const price = last.length >= 5 ? last[4] : last[1];
          if (typeof price === 'number' && Number.isFinite(price) && isPriceLike(price)) {
            return [{
              symbol: asset,
              price,
              timestamp: timestampToMs(last[0]),
              source: 'asJson',
            }];
          }
        }
      }
    }

    return [];
  }

  function pickBestPrice(inspection) {
    const asJsonTicks = extractTicksFromAsJson(inspection.asJson);
    if (asJsonTicks.length) {
      const visibleHint = inspection.visiblePlatformPrice;
      const match = visibleHint
        ? asJsonTicks.find((t) => nearPrice(t.price, visibleHint))
        : null;
      return match ?? asJsonTicks[0];
    }

    const mp = inspection.msgpack?.value;
    if (Array.isArray(mp)) {
      const mpTicks = extractTicksFromAsJson(mp);
      if (mpTicks.length) return mpTicks[0];
      const prices = mp.filter((x) => typeof x === 'number' && isPriceLike(x));
      const ts = mp.find((x) => typeof x === 'number' && x > 1e11);
      const price = prices.find((p) => !nearPrice(p, ts)) ?? prices[0];
      if (price != null) {
        return { price, timestamp: ts ?? Date.now(), source: 'msgpack-array' };
      }
    }

    if (inspection.nearVisible?.length) {
      return {
        price: inspection.nearVisible[0],
        timestamp: Date.now(),
        source: 'nearVisible',
      };
    }

    const f64 = inspection.float64le || [];
    if (f64.length >= 2) {
      const a = f64[0].v;
      const b = f64[1].v;
      if (a > 1e9 && isPriceLike(b)) return { price: b, timestamp: a, source: 'float64le[ts,price]' };
      if (b > 1e9 && isPriceLike(a)) return { price: a, timestamp: b, source: 'float64le[price,ts]' };
    }
    if (f64.length >= 1 && isPriceLike(f64[0].v)) {
      return { price: f64[0].v, timestamp: Date.now(), source: 'float64le[0]' };
    }
    if (inspection.priceLike?.length) {
      return {
        price: inspection.priceLike[0],
        timestamp: Date.now(),
        source: 'float-scan',
      };
    }
    return null;
  }

  function pushDebug(entry) {
    debugId += 1;
    const row = { id: debugId, at: new Date().toISOString(), ...entry };
    debugLog.push(row);
    while (debugLog.length > MAX_DEBUG) debugLog.shift();
    return row;
  }

  async function processBinaryFrame(raw, meta) {
    const dtype = dataTypeOf(raw);
    const bytes = await toUint8Async(raw);
    if (!bytes) {
      const row = pushDebug({ ...meta, dataType: dtype, error: 'cannot convert to bytes' });
      console.warn('[PRIME Bridge BIN]', row);
      return row;
    }

    const inspection = inspectBinary(bytes, { ...meta, dataType: dtype });
    const picked = pickBestPrice(inspection);
    const row = pushDebug({
      ...meta,
      dataType: dtype,
      inspection,
      picked,
    });

    console.groupCollapsed(
      '[PRIME Bridge BIN] #' + row.id + ' ' + dtype + ' ' + bytes.length + 'B' +
        (picked ? ' → price ' + picked.price : ''),
    );
    console.log('typeof:', dtype);
    console.log('byteLength:', bytes.length);
    console.log('first100hex:', inspection.first100hex);
    console.log('asUtf8:', inspection.asUtf8);
    console.log('asJson:', inspection.asJson);
    console.log('msgpack:', inspection.msgpack);
    console.log('visiblePlatformPrice:', inspection.visiblePlatformPrice);
    console.log('nearVisible:', inspection.nearVisible);
    console.log('priceLike:', inspection.priceLike);
    console.log('float64le:', inspection.float64le?.slice(0, 8));
    console.log('picked:', picked);
    console.groupEnd();

    return row;
  }

  window.__PRIME_BRIDGE_BINARY__ = {
    debugLog,
    processBinaryFrame,
    inspectBinary,
    pickBestPrice,
    extractTicksFromAsJson,
    timestampToMs,
    dataTypeOf,
    readVisiblePlatformPrice,
    exportDebug() {
      return JSON.stringify(debugLog, null, 2);
    },
  };
})();
