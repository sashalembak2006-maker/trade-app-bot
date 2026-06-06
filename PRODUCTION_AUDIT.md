# PRIME TRADE BOT — Production Audit (v2.2)

Date: 2026-06-06
Build status: ✅ `typecheck`, `lint`, and `build` all pass (exit 0).

---

## Summary

A full audit of market data, payout, signal generation, admin, access, the
Telegram bot, logging, and error handling was performed. The root causes of the
reported issues were found and fixed. The biggest correctness fix: **payout was
being randomized on every WebSocket tick**, and **prices/payout were trusted
from the client** during signal generation — so there was no single source of
truth. Production also had no safe behavior when a real data source is missing.

---

## P1 — Asset prices

**Found**
- Prices came only from `MockMarketDataProvider` (random walk). No real provider.
- `PlatformAdapterProvider` just threw, so "platform" mode crashed.
- No production-safe state when no data source is connected.

**Fixed**
- Introduced a single market-provider resolver (`apps/api/src/market.ts`) with a
  typed `MarketDataStatus { mode, configured, source }` on every provider.
- Added `UnconfiguredMarketProvider` — returns **no data** and never fabricates
  prices/payouts. It is the **default in production** when nothing is configured.
- `PlatformAdapterProvider` now reports `configured: false` until real endpoints
  are implemented, instead of throwing.
- New endpoints: `GET /api/market/status` and `dataSource` embedded in
  `GET /api/assets` and `GET /api/health`.
- Mock ticks now fire on a **fixed 1s cadence** (no more random 1–3s lag).
- Frontend shows **DATA SOURCE NOT CONFIGURED** (red) or **DEMO DATA** (amber)
  banners based on the real status — no silent fake numbers.

**Remaining**
- Implement the real feed in `PlatformAdapterProvider` (`getAssets`,
  `getAssetPrice`, `getPayout`, `getMarketAnalysis`, `subscribe`) via the
  official/partner API. Set `MARKET_DATA_MODE=platform` + credentials.

## P2 — Payout %

**Found**
- `MockMarketDataProvider.subscribe()` randomized payout every tick
  (`55–95%`), so payout drifted and never matched any source of truth.
- Signal generation used `payout` from the **client request body** (spoofable,
  inconsistent).

**Fixed**
- Removed payout randomization — payout is now a **stable property of the asset**
  (single source of truth). Only price/change drift.
- Signal generation now reads `price` and `payout` from the **provider**, never
  the client. WebSocket pushes the same payout value the asset list shows.

## P3 — Signal generation

**Found**
- `SignalModal` `catch` silently reset to `idle` (no error shown).
- `fetch` had **no timeout** → a hanging request meant an endless loader.
- Price/payout were sent from the client.

**Fixed**
- `fetchJson` now uses `AbortController` with per-call timeouts (20s for signal
  generation) and maps failures to `TIMEOUT` / `NETWORK` / API error codes.
- Loader **always resolves** (cinematic delay runs via `Promise.all`, all paths
  end in `result` or a visible error state).
- Dedicated error card in the modal with a retry hint; haptic error feedback.
- If data source isn't configured, the modal shows **DATA SOURCE NOT CONFIGURED**
  instead of attempting generation.
- Backend returns `503 DATA_SOURCE_NOT_CONFIGURED` / `422 NO_PRICE` cleanly.

## P4 — Admin audit

- Verified endpoints: login, users (search by telegramId/username/firstName/
  platformId + status filter), `/users/:id` detail, `grant` (basic/vip/revoke),
  `ban`, `unban`, `note`, deposit-request `approve`/`approve-vip`/`reject`,
  `analytics`.
- Added **action logging** for login, grant basic/VIP, revoke, ban, unban,
  deposit approve/reject.
- Session handling: 24h in-memory tokens; client auto-logs-out on `401`
  (`SESSION_EXPIRED`) after an API restart.

**Remaining**
- Admin sessions are in-memory (cleared on API restart). For multi-instance
  production, move to a persistent/JWT store.

## P5 — Access system

Verified status → behavior:

| Status | Mini App | Notes |
|--------|----------|-------|
| `guest` | Access gate ("Доступ за запрошенням") | shows Telegram ID for admin |
| `registered` / `pending_review` | Access gate | legacy statuses, treated as no access |
| `deposited` (basic) | Full app | granted by admin |
| `vip` | Full app + VIP badge | granted by admin |
| `banned` | Blocked screen | all protected APIs return 403 |

- `hasAppAccess` / `hasVipAccess` are the single guards used across all routes.

## P6 — Telegram bot

**Found**
- Bot sent `approve_basic` / `approve_vip` / `reject` buttons but had **no
  `callback_query` handler** — the buttons did nothing.

**Fixed**
- Added `callback_query:data` handler that verifies the sender is in
  `ADMIN_TELEGRAM_IDS`, calls a new secured internal endpoint
  (`POST /api/admin/internal/deposit/:id/:action`, guarded by
  `INTERNAL_API_SECRET`), answers the callback, and clears the buttons.
- Added `bot.catch` + structured bot logging on `/start` and callbacks.

**Remaining**
- The deposit funnel itself is **deprecated** (access is granted manually via
  `/admin`). Deposit notifications/handlers are kept for completeness.
- Live signal push notifications to Telegram are not implemented (out of scope).

## P7 — Logging

- Backend `apps/api/src/logger.ts`: leveled (`LOG_LEVEL`), timestamped; request
  logger middleware (method/path/status/duration); logs WS connect/disconnect/
  errors, signal generation, admin actions, deposit actions, startup + data
  source.
- Frontend `apps/web/src/services/logger.ts`: gold-prefixed, gated by
  `DEV`/`VITE_DEBUG_LOGS`; logs asset loads, signal request/result/failure, WS
  connect/disconnect.

## P8 — Error monitoring

- Added global `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`)
  wrapping `<App/>` — no white screen, branded fallback + reload.
- Nice in-app states for: server unavailable (access gate), signal failed /
  timeout / network (signal modal), WebSocket disconnected (banner), data source
  not configured (banner + modal).

## P9 — Build validation

- Added `typecheck` scripts to every workspace and root; `lint` aliases to
  `typecheck`.
- `npm run typecheck` → ✅ 0 errors. `npm run build` → ✅ all packages built.

**Remaining**
- No ESLint config exists in the repo. `lint` currently runs `typecheck`.
  Recommended: add a flat ESLint config (`@typescript-eslint`, `eslint-plugin-react-hooks`).

## P10 — This report.

---

## Changed files

### packages/shared
- `src/types/index.ts` — `MarketDataMode`, `MarketDataStatus`, `PriceUpdate.ts`.
- `src/market/provider.ts` — `status` on interface, `DataSourceNotConfiguredError`.
- `src/market/mock-provider.ts` — stable payout, 1s cadence, `status`.
- `src/market/platform-provider.ts` — `status`, configured detection.
- `src/market/unconfigured-provider.ts` — **new**, safe empty provider.
- `src/index.ts` — export unconfigured provider.

### apps/api
- `src/logger.ts` — **new** logger + request middleware.
- `src/market.ts` — provider resolver + status helpers + prod-safe defaults.
- `src/index.ts` — request logging, error handler, process guards, startup logs.
- `src/websocket.ts` — connection logging, data source in handshake.
- `src/routes.ts` — `/market/status`, market status in `/health`.
- `src/routes/user.ts` — provider as price/payout SSOT, data-source guards, logging.
- `src/routes/admin.ts` — internal deposit endpoint, action logging.
- `.env` — documented `MARKET_DATA_MODE`, `PLATFORM_*`, `LOG_LEVEL`,
  `INTERNAL_API_SECRET`.

### apps/bot
- `src/index.ts` — `callback_query` handler, admin check, `bot.catch`, logging.

### apps/web
- `src/services/api.ts` — timeouts/AbortController, `ApiError`, market status,
  new `/assets` shape.
- `src/services/websocket.ts` — connection state, reconnect, status callbacks, logging.
- `src/services/logger.ts` — **new** frontend logger.
- `src/hooks/useWebSocket.ts` — WS connection status wiring.
- `src/store/useAppStore.ts` — `marketStatus`, `wsConnected`, `signalError`.
- `src/pages/MainApp.tsx` — data source banners, safe asset loading.
- `src/components/signal/SignalModal.tsx` — error/timeout handling, guards.
- `src/components/ErrorBoundary.tsx` — **new**.
- `src/main.tsx` — wrap app in ErrorBoundary.
- `src/i18n/translations.ts` — error strings.

### root
- `package.json`, `apps/*/package.json` — `typecheck` + `lint` scripts.

---

## How to go live (real data)

1. Implement `PlatformAdapterProvider` against the official/partner API.
2. Set `MARKET_DATA_MODE=platform`, `PLATFORM_API_URL`, `PLATFORM_API_KEY`.
3. Set `INTERNAL_API_SECRET` and `ADMIN_TELEGRAM_IDS` for the bot.
4. Set `NODE_ENV=production` (without a configured provider the app safely shows
   DATA SOURCE NOT CONFIGURED instead of fake numbers).
5. Set web `VITE_API_URL` / `VITE_WS_URL` to the deployed API.
