/** Socket.IO binary attachment decoder for Pocket Option WS (Node collector). */

export function isPlaceholder(v: unknown): boolean {
  return v != null && typeof v === 'object' && (v as { _placeholder?: boolean })._placeholder === true;
}

function mpDecode(bytes: Uint8Array, pos: number): { value: unknown; next: number } {
  if (pos >= bytes.length) throw new Error('msgpack eof');
  const tag = bytes[pos++];
  if (tag <= 0x7f) return { value: tag, next: pos };
  if (tag >= 0xe0) return { value: tag - 256, next: pos };
  if (tag === 0xc0) return { value: null, next: pos };
  if (tag >= 0xa0 && tag <= 0xbf) {
    const len = tag - 0xa0;
    const s = new TextDecoder().decode(bytes.subarray(pos, pos + len));
    return { value: s, next: pos + len };
  }
  if (tag >= 0x90 && tag <= 0x9f) {
    const len = tag - 0x90;
    const arr: unknown[] = [];
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
    const arr: unknown[] = [];
    let p = pos;
    for (let i = 0; i < len; i++) {
      const r = mpDecode(bytes, p);
      arr.push(r.value);
      p = r.next;
    }
    return { value: arr, next: p };
  }
  if (tag === 0xcb) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 8);
    return { value: view.getFloat64(0, false), next: pos + 8 };
  }
  if (tag === 0xca) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 4);
    return { value: view.getFloat32(0, false), next: pos + 4 };
  }
  throw new Error(`msgpack tag 0x${tag.toString(16)}`);
}

export function decodeMsgPack(raw: Buffer | ArrayBuffer): unknown {
  const bytes =
    raw instanceof ArrayBuffer
      ? new Uint8Array(raw)
      : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  return mpDecode(bytes, 0).value;
}

function decodeBinaryAttachment(buf: Buffer): unknown {
  try {
    return decodeMsgPack(buf);
  } catch {
    try {
      const text = buf.toString('utf8').trim();
      if (text.startsWith('[') || text.startsWith('{')) return JSON.parse(text);
    } catch {
      /* ignore */
    }
  }
  if (buf.length >= 8) {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return view.getFloat64(0, false);
  }
  return null;
}

function reconstruct(node: unknown, binaries: Buffer[]): unknown {
  if (isPlaceholder(node)) {
    const idx = typeof (node as { num?: number }).num === 'number' ? (node as { num: number }).num : 0;
    const buf = binaries[idx];
    return buf ? decodeBinaryAttachment(buf) : node;
  }
  if (Array.isArray(node)) return node.map((x) => reconstruct(x, binaries));
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(node as object)) {
      out[k] = reconstruct((node as Record<string, unknown>)[k], binaries);
    }
    return out;
  }
  return node;
}

export interface ParsedSocketFrame {
  event: string;
  data: unknown;
  pendingBinary?: { attachmentCount: number; payload: unknown[]; received: Buffer[] };
}

export function parseSocketIoTextFrame(text: string): ParsedSocketFrame | null {
  if (!text || text[0] !== '4') return null;
  const packetType = text[1];
  if (packetType !== '2' && packetType !== '5' && packetType !== '6') return null;

  let i = 2;
  let attachmentCount = 0;
  if (packetType === '5' || packetType === '6') {
    while (i < text.length && text[i] >= '0' && text[i] <= '9') {
      attachmentCount = attachmentCount * 10 + (text.charCodeAt(i) - 48);
      i++;
    }
    if (text[i] !== '-') return null;
    i++;
  }

  const start = text.indexOf('[', i);
  if (start < 0) return null;
  let payload: unknown[];
  try {
    payload = JSON.parse(text.slice(start)) as unknown[];
  } catch {
    return null;
  }
  if (!Array.isArray(payload) || payload.length < 1) return null;

  const frame: ParsedSocketFrame = {
    event: String(payload[0]),
    data: payload.length === 2 ? payload[1] : payload.slice(1),
  };
  if (attachmentCount > 0) {
    frame.pendingBinary = { attachmentCount, payload, received: [] };
  }
  return frame;
}

export function finishBinaryAssembly(
  payload: unknown[],
  binaries: Buffer[],
): { event: string; data: unknown } | null {
  if (!Array.isArray(payload) || payload.length < 1) return null;
  const event = String(payload[0]);
  const args = payload.slice(1).map((arg) => reconstruct(arg, binaries));
  return { event, data: args.length === 1 ? args[0] : args };
}
