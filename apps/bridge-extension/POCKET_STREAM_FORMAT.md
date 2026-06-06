# Pocket Option `updateStream` format (reference)

Saved after fixing v1.6.5 — do not regress.

## What PO sends

```
WebSocket text:  451-["updateStream",{"_placeholder":true,"num":0}]
WebSocket binary attachment (UTF-8 JSON):
  [["EURJPY_otc",1780789097.061,189.811]]
```

- **Not** raw floats. `float-scan` on attachment bytes gives garbage (e.g. `2597` instead of `189.811`).
- One frame can contain **many** symbols (batch).
- Timestamp is **Unix seconds** (with fractional part).

## Correct decode flow

1. Assemble Socket.IO placeholder + binary attachment
2. `TextDecoder` → `JSON.parse`
3. Parse nested `[[symbol, ts, price], ...]`
4. For each tick: symbol + price + `ts * 1000` → emit to backend/UI

## Wrong approach (caused the bug)

```javascript
// BAD: first float32 in binary buffer
picked = { price: float32le[0], source: 'float-scan' }
```

## Debug

Use extension popup → **Copy Binary Debug**. Confirm:

- `inspection.asJson` matches PO price
- `picked.source` === `"asJson"`
- `picked.price` === third element of inner array
