# updateStream — зразки декодованих binary-кадрів

Розширення v1.6.0 збирає зразки події `451-["updateStream",{"_placeholder":true,"num":0}]` + наступний binary frame.

## Як зібрати зразки

1. Перезавантажте розширення в `chrome://extensions`
2. Відкрийте Pocket Option → F12 → Console
3. Перемикайте OTC пари на графіку
4. У консолі зʼявляться групи `[PRIME Bridge] updateStream decoded #N`

## Команди в консолі (на сторінці PO)

```js
__PRIME_BRIDGE_DUMP_STREAM_SAMPLES__(20)   // таблиця symbol / price / timestamp
__PRIME_BRIDGE_EXPORT_STREAM_SAMPLES__()  // JSON + копія в буфер обміну
```

## Де зберігаються

| Місце | Що |
|-------|-----|
| `window.__PRIME_BRIDGE_STREAM_SAMPLES__` | останні 80 зразків у памʼяті |
| `chrome.storage.local.prime_bridge_stream_samples` | те саме на диску розширення |

Перегляд storage: DevTools → Application → Extension storage → PRIME TRADE BOT Bridge.

## Структура одного зразка

```json
{
  "id": 1,
  "at": "2026-06-06T20:00:00.000Z",
  "event": "updateStream",
  "frameText": "451-[\"updateStream\",{\"_placeholder\":true,\"num\":0}]",
  "attachmentCount": 1,
  "reconstructed": [1780775137853, 0.99035],
  "binary": {
    "byteLength": 16,
    "hex": "...",
    "float64le": [{ "off": 0, "v": 1780775137853 }, { "off": 8, "v": 0.99035 }]
  },
  "tick": {
    "symbol": "AUD/CAD OTC",
    "price": 0.99035,
    "timestamp": 1780775137853
  }
}
```

Скопіюйте JSON з `__PRIME_BRIDGE_EXPORT_STREAM_SAMPLES__()` сюди для аналізу формату.
