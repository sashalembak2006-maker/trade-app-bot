# Production Architecture — 10–20 referral users (24/7)

This document describes how PRIME TRADE BOT runs **without your local browser**, what Pocket Option actually provides, and what you must deploy on a VPS.

---

## Overview

```
┌─────────────────────┐     every 1s      ┌─────────────────────┐
│  VPS Data Collector │ ────────────────► │   Backend (API)      │
│  (apps/collector)   │  POST /bridge/…   │   BridgeMarketProvider│
│  Pocket WS 24/7     │  + heartbeat      │   WebSocket /ws       │
└─────────────────────┘                   └──────────┬────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────────┐
                    ▼                                ▼                    ▼
              Mini App user 1                  Mini App user 2 …     Admin panel
              (Telegram WebApp)                (10–20 users)         /admin/market-data
```

| Component | Role |
|-----------|------|
| **Data Collector** (`apps/collector`) | Runs 24/7 on VPS; connects to Pocket Option Socket.IO; pushes assets to API |
| **Backend** (`apps/api`) | Single source of truth; ingests collector/bridge data; fans out via WebSocket |
| **Mini App** (`apps/web`) | Reads assets + live updates; signals use **backend prices only** |
| **Bridge Extension** (optional) | Dev / fallback only — **not** suitable for 10–20 production users |

Production `MARKET_DATA_MODE=platform`. Mock data is **dev only**.

---

## 1. Data Collector Service (`apps/collector`)

### What it does

- Connects to Pocket Option WebSocket (`PO_WS_URL`)
- Authenticates with session payload (`PO_AUTH_MESSAGE`)
- Parses `updateAssets` → **all active pairs + payout %**
- Parses `updateStream` → **live price ticks for ONE active symbol**
- POSTs merged data to `POST /api/bridge/assets/update` every second
- Sends heartbeat to `POST /api/collector/heartbeat` every 10s
- **Auto-reconnect** with exponential backoff (1s → 30s max)
- Exits cleanly when admin clicks **Restart collector** (PM2/systemd restarts it)

### Environment (VPS)

```env
API_URL=https://api.yourdomain.com
BRIDGE_SECRET=your-long-random-secret
COLLECTOR_SECRET=your-collector-secret

# Pocket Option Socket.IO endpoint (region-specific — inspect browser DevTools → Network → WS)
PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket

# Full auth frame copied from browser after login (expires — must be refreshed periodically)
PO_AUTH_MESSAGE=42["auth",{"session":"…","isDemo":0,"uid":…}]

COLLECTOR_PUSH_INTERVAL_MS=1000
COLLECTOR_HEARTBEAT_MS=10000
```

### Run with PM2 (example)

```bash
cd apps/collector
npm run build
pm2 start dist/index.js --name prime-collector
pm2 save
```

### Getting `PO_AUTH_MESSAGE`

1. Log in to Pocket Option in Chrome
2. DevTools → Network → filter **WS**
3. Find Socket.IO connection → Messages
4. Copy the **first `42["auth",…]` frame** you send after `40{…}`
5. Paste into `PO_AUTH_MESSAGE` on the VPS

**Important:** This session **expires** (hours/days). For true 24/7 you need:
- A monitored session refresh process, **or**
- An **official partner API** via `OfficialPocketProvider` (see below)

---

## 2. Backend

### Data flow

- Collector and Bridge Extension both POST to `/api/bridge/assets/update`
- `BridgeMarketDataProvider` stores assets in memory
- **Never fabricates** prices — missing price stays `null`
- WebSocket `/ws` broadcasts `price_update` to subscribed Mini App clients
- Supports **10–20 concurrent users** easily (lightweight in-memory fan-out)

### Admin endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/market-data` | All assets, stale flags, collector status |
| `GET /api/admin/collector/status` | Collector online / WS / asset counts |
| `POST /api/admin/collector/restart` | Sets restart flag; collector exits for PM2 |

### Production `.env`

```env
NODE_ENV=production
MARKET_DATA_MODE=platform
BRIDGE_SECRET=…
COLLECTOR_SECRET=…
ALLOW_RUNTIME_MODE_SWITCH=false
```

---

## 3. Mini App

- Loads assets from `GET /api/assets` (backend provider)
- Subscribes to WebSocket for `price_update` + `payout` changes
- Shows **«ціна недоступна»** when `price === null`
- Signal generation reads price/payout from provider — **never from client**

---

## 4. Honest limits — Pocket Option data

### Does Pocket Option provide live prices for ALL pairs at once?

**No.**

| Data | Available for all active assets? | How |
|------|----------------------------------|-----|
| **Payout %** | ✅ Yes | `updateAssets` WebSocket message |
| **Live price (moving tick)** | ❌ No — **one symbol at a time** | `updateStream` only for the **active chart symbol** |
| **Price in asset list** | Sometimes in UI, not a reliable multi-symbol feed | DOM / list only |

### Can the current Bridge Extension collect all live prices?

**No.** Same limitation:

- Extension WebSocket hook reads `updateAssets` (all payouts) + `updateStream` (one live price)
- DOM scraping cannot read TradingView iframe prices
- Extension requires **your browser open** — not production for referrals

### What is needed for 24/7 autonomous work?

| Requirement | Solution |
|-------------|----------|
| Always-on data feed | VPS collector (`apps/collector`) |
| Valid PO session | `PO_AUTH_MESSAGE` + refresh strategy |
| Central API | Backend on VPS/cloud |
| 10–20 users | Backend WebSocket (already implemented) |
| No fake prices | `MARKET_DATA_MODE=platform`, no mock in prod |
| All payouts | `updateAssets` via collector ✅ |
| All live prices simultaneously | **Not possible** without official multi-symbol API |

### If you need every pair’s live price 24/7

You would need one of:

1. **Official Pocket Option partner / API access** → implement `OfficialPocketProvider`
2. **Licensed market data** mapped to PO symbols (still may diverge from PO chart)
3. **Rotating symbol subscriptions** (complex, incomplete, not recommended)

We **do not** implement price rotation or fabrication.

---

## 5. `OfficialPocketProvider` interface

Located in `packages/shared/src/market/official-pocket-provider.ts`:

```typescript
interface OfficialPocketProvider {
  readonly connected: boolean;
  readonly lastUpdate: number | null;
  connect(): Promise<void>;
  disconnect(): void;
  getAssets(): Promise<PocketQuote[]>;
  getPayouts(): Promise<Record<string, number>>;
  getPrices(): Promise<Record<string, number | null>>;
  subscribeToTicks(callback: (tick: PriceUpdate) => void): () => void;
}
```

`UnconfiguredOfficialPocketProvider` is the default stub — throws / reports unconfigured until you wire a real API.

When you receive official docs:

1. Implement `OfficialPocketProvider` in a new file (e.g. `official-pocket-api-provider.ts`)
2. Point the collector at it instead of raw WebSocket, **or**
3. Call it directly from the API process

---

## 6. Deployment checklist

- [ ] VPS: API (`apps/api`) behind HTTPS
- [ ] VPS: Collector (`apps/collector`) with PM2
- [ ] `MARKET_DATA_MODE=platform`
- [ ] `BRIDGE_SECRET` + `COLLECTOR_SECRET` set
- [ ] Mini App `VITE_API_URL` / `VITE_WS_URL` → production API
- [ ] Admin: `/admin/market-data` shows collector **Online: yes**
- [ ] Asset count > 0, payouts updating
- [ ] Only **one** (active) asset has moving price — expected behaviour
- [ ] Session refresh process documented for your team

---

## 7. Dev vs Production

| | Dev | Production |
|---|-----|------------|
| Data source | Bridge Extension or Collector | **Collector on VPS only** |
| Mock data | Allowed (`MARKET_DATA_MODE=mock`) | **Forbidden** |
| Users | Local browser | 10–20 Telegram Mini App users |
| Prices | Real from PO feed only | Same — no random/mock |
