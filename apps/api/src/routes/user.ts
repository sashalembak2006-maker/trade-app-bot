import { Router } from 'express';
import {
  SignalEngine,
  BridgeMarketDataProvider,
  calculateMartingale,
  isPlausibleMarketPrice,
  NEWS,
  INDICATORS,
  LEARNING,
} from '@trade-app/shared';
import { getMarketProvider, getMarketMode } from '../market.js';
import { requestFocus, clearFocus } from '../services/focus.js';
import { prisma } from '../db.js';
import { log } from '../logger.js';
import { notifyAdminsDepositRequest } from '../services/notify.js';
import { resolveTelegramUser } from '../middleware/auth.js';
import { serializeUser, hasAppAccess, hasVipAccess, hasLimitedAccess, hasSignalAccess } from '../middleware/access.js';
import { livePriceFromTickStore, resolveSignalEntryPrice } from '../services/signal-price.js';

const router = Router();
const signalEngine = new SignalEngine();

const focusGraceMs = () =>
  Math.min(Math.max(Number(process.env.SIGNAL_FOCUS_GRACE_MS) || 600, 200), 2000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.use(resolveTelegramUser);

function readHeader(req: { headers: Record<string, unknown> }, key: string): string | undefined {
  const raw = req.headers[key];
  if (!raw) return undefined;
  const value = String(raw);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function readTelegramId(req: { body?: Record<string, unknown>; headers: Record<string, unknown> }) {
  const raw = req.headers['x-telegram-id'] || req.body?.telegramId;
  if (!raw) return null;
  return String(raw);
}

async function ensureUser(
  req: { body?: Record<string, unknown>; headers: Record<string, unknown> },
  res: { locals: Record<string, unknown> },
) {
  const telegramId = await readTelegramId(req);
  if (!telegramId) return null;

  const existing = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });
  if (existing) {
    res.locals.user = existing;
    return existing;
  }

  const firstName = String(readHeader(req, 'x-telegram-first-name') || req.body?.firstName || 'User');
  const lastName = req.body?.lastName as string | undefined;
  const username = readHeader(req, 'x-telegram-username') ?? (req.body?.username as string | undefined);

  const user = await prisma.user.create({
    data: {
      telegramId: BigInt(telegramId),
      firstName,
      lastName,
      username,
      status: 'guest',
    },
  });
  res.locals.user = user;
  return user;
}

router.get('/me', async (req, res) => {
  const user = await syncUserProfile(req, res);
  if (!user) return res.status(401).json({ error: 'Telegram user required' });
  const signalCount = await prisma.signalHistory.count({ where: { userId: user.id } });
  res.json({ ...serializeUser(user), signalCount });
});

async function syncUserProfile(
  req: { body?: Record<string, unknown>; headers: Record<string, unknown> },
  res: { locals: Record<string, unknown> },
) {
  const user = await ensureUser(req, res);
  if (!user) return null;

  const firstName = String(readHeader(req, 'x-telegram-first-name') || req.body?.firstName || user.firstName || 'User');
  const lastName = (req.body?.lastName as string | undefined) ?? user.lastName;
  const username = readHeader(req, 'x-telegram-username') ?? (req.body?.username as string | undefined);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: firstName || user.firstName,
      lastName,
      username: username ?? user.username,
      lastActiveAt: new Date(),
    },
  });
  res.locals.user = updated;
  return updated;
}

router.get('/access-status', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = await syncUserProfile(req, res);
  if (!user) return res.status(401).json({ error: 'Telegram user required' });
  res.json({
    status: user.status,
    accessLevel: user.accessLevel,
    isVip: user.isVip,
    isInvited: user.isInvited,
    isBanned: user.isBanned,
    hasAppAccess: hasAppAccess(user),
    hasVipAccess: hasVipAccess(user),
    hasLimitedAccess: hasLimitedAccess(user),
    hasSignalAccess: hasSignalAccess(user),
  });
});

/** Silent profile sync from Telegram — does not change access status */
router.post('/sync', async (req, res) => {
  const user = await syncUserProfile(req, res);
  if (!user) return res.status(401).json({ error: 'Telegram user required' });
  res.json(serializeUser(user));
});

/**
 * Registration — user submits Pocket platform ID (NOT password).
 * Sets status `registered`; deposit claim is a separate step.
 */
router.post('/register', async (req, res) => {
  const user = await syncUserProfile(req, res);
  if (!user) return res.status(401).json({ error: 'Telegram user required' });
  if (user.isBanned) return res.status(403).json({ error: 'Banned' });
  if (hasAppAccess(user)) {
    return res.status(400).json({ error: 'Already has access', code: 'ALREADY_ACTIVE' });
  }
  if (user.status === 'pending_deposit') {
    return res.status(400).json({ error: 'Deposit already pending review', code: 'PENDING_REVIEW' });
  }

  const platformAccountId = String(req.body?.platformAccountId ?? '').trim();
  if (!platformAccountId) {
    return res.status(400).json({ error: 'platformAccountId required' });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      platformAccountId,
      status: 'registered',
    },
  });

  log.info('User registered', { userId: user.id, platformAccountId });
  res.json(serializeUser(updated));
});

/**
 * User claims they deposited — creates deposit request, sets pending_deposit, notifies admin.
 */
router.post('/deposit-claim', async (req, res) => {
  const user = await syncUserProfile(req, res);
  if (!user) return res.status(401).json({ error: 'Telegram user required' });
  if (user.isBanned) return res.status(403).json({ error: 'Banned' });
  if (hasAppAccess(user)) {
    return res.status(400).json({ error: 'Already has access', code: 'ALREADY_ACTIVE' });
  }
  if (user.status === 'pending_deposit') {
    return res.status(400).json({ error: 'Already pending review', code: 'PENDING_REVIEW' });
  }
  if (!user.platformAccountId) {
    return res.status(400).json({ error: 'Register first — platformAccountId required', code: 'NOT_REGISTERED' });
  }

  const amount = Number(req.body?.amount) || Number(process.env.MIN_DEPOSIT_AMOUNT) || 100;
  const proofText = req.body?.proofText ? String(req.body.proofText) : undefined;

  const request = await prisma.depositRequest.create({
    data: {
      userId: user.id,
      amount,
      proofText,
      status: 'pending',
    },
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { status: 'pending_deposit' },
  });

  await notifyAdminsDepositRequest({
    username: updated.username,
    telegramId: updated.telegramId.toString(),
    platformAccountId: updated.platformAccountId,
    amount,
    requestId: request.id,
  });

  log.info('Deposit claim submitted', { userId: user.id, requestId: request.id });
  res.json({ ...serializeUser(updated), requestId: request.id });
});

router.get('/assets', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasLimitedAccess(user)) return res.status(403).json({ error: 'Access denied', code: 'NO_ACCESS' });
  const provider = getMarketProvider();
  const assets = await provider.getAssets();
  res.json({ assets, dataSource: provider.status });
});

/** Live exit price from bridge — no synthetic fallback (signal settlement). */
router.get('/assets/:symbol/price', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasSignalAccess(user)) return res.status(403).json({ error: 'Access denied', code: 'NO_ACCESS' });
  const symbol = decodeURIComponent(req.params.symbol);
  const provider = getMarketProvider();
  if (!provider.status.configured) {
    return res.status(503).json({ error: 'DATA SOURCE NOT CONFIGURED', code: 'DATA_SOURCE_NOT_CONFIGURED' });
  }
  if (getMarketMode() === 'platform') {
    requestFocus(symbol, 15_000);
  }
  try {
    if (provider instanceof BridgeMarketDataProvider) {
      const resolved = resolveSignalEntryPrice(symbol, provider);
      if (resolved.price != null) {
        return res.json({
          symbol,
          price: resolved.price,
          live: resolved.source === 'live_tick' || resolved.source === 'bridge_live',
          source: resolved.source,
          at: Date.now(),
        });
      }
      const waitMs = Math.min(Number(req.query.waitMs) || 800, 2000);
      const price = await provider.waitForLivePrice(symbol, waitMs, { allowSynthetic: false });
      return res.json({ symbol, price, live: true, at: Date.now() });
    }

    const tickLive = livePriceFromTickStore(symbol);
    if (tickLive != null) {
      return res.json({ symbol, price: tickLive, live: true, at: Date.now() });
    }
    const price = await provider.getAssetPrice(symbol);
    res.json({ symbol, price, live: true, at: Date.now() });
  } catch {
    res.status(422).json({ error: 'No live price for asset', code: 'NO_PRICE' });
  }
});

router.get('/assets/:symbol/analysis', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasSignalAccess(user)) return res.status(403).json({ error: 'Access denied', code: 'NO_ACCESS' });
  const provider = getMarketProvider();
  if (!provider.status.configured) {
    return res.status(503).json({ error: 'DATA SOURCE NOT CONFIGURED', code: 'DATA_SOURCE_NOT_CONFIGURED' });
  }
  try {
    const analysis = await provider.getMarketAnalysis(req.params.symbol);
    res.json(analysis);
  } catch {
    res.status(503).json({ error: 'DATA SOURCE NOT CONFIGURED', code: 'DATA_SOURCE_NOT_CONFIGURED' });
  }
});

/** Ask Platform Bridge to focus Pocket Option on this symbol (live price stream). */
router.post('/focus', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasLimitedAccess(user)) return res.status(403).json({ error: 'Access denied', code: 'NO_ACCESS' });
  const symbol = String(req.body?.symbol ?? '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  if (getMarketMode() !== 'platform') {
    return res.json({ ok: true, symbol, focused: false });
  }
  const ttlMs = Math.min(Math.max(Number(req.body?.ttlMs) || 60_000, 5_000), 180_000);
  requestFocus(symbol, ttlMs);
  res.json({ ok: true, symbol, focused: true, ttlMs });
});

router.post('/signals/generate', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.isBanned) return res.status(403).json({ error: 'Banned' });
  if (!hasSignalAccess(user)) return res.status(403).json({ error: 'Access denied', code: 'NO_ACCESS' });

  const symbol = String(req.body?.symbol ?? req.body?.assetSymbol ?? '').trim();
  const assetId = req.body?.assetId ? String(req.body.assetId) : symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const timeframe = String(req.body?.timeframe ?? '').trim();
  const isOTC = req.body?.isOTC ?? /otc/i.test(symbol);

  if (!symbol || !timeframe) {
    return res.status(400).json({ error: 'assetSymbol and timeframe required' });
  }

  const provider = getMarketProvider();
  if (!provider.status.configured) {
    log.warn('Signal generation blocked: data source not configured', { symbol });
    return res.status(503).json({ error: 'DATA SOURCE NOT CONFIGURED', code: 'DATA_SOURCE_NOT_CONFIGURED' });
  }

  // Require bridge catalog entry; allow signal when we have any anchored quote.
  if (provider instanceof BridgeMarketDataProvider) {
    const rows = provider.rows();
    const row = rows.find((r) => r.symbol === symbol);
    if (!row) {
      return res.status(422).json({
        error: `No bridge data for ${symbol}`,
        code: 'NO_ASSET_DATA',
      });
    }
    const hasQuote = provider.getBridgeQuote(symbol, 120_000) != null;
    if (row.stale && row.price == null && !hasQuote) {
      return res.status(422).json({
        error: 'No live price for asset — open this pair on Pocket Option trading chart',
        code: 'NO_PRICE',
      });
    }
  }

  const waitMs = Math.min(
    Math.max(Number(process.env.SIGNAL_PRICE_WAIT_MS) || 1800, 600),
    3000,
  );
  if (getMarketMode() === 'platform') {
    requestFocus(symbol, waitMs + 45_000);
  }

  let price: number | null = null;
  let priceSource: string | null = null;
  let payout: number;
  try {
    payout = await provider.getPayout(symbol);

    if (provider instanceof BridgeMarketDataProvider) {
      const resolved = resolveSignalEntryPrice(symbol, provider);
      price = resolved.price;
      priceSource = resolved.source;

      if (price == null) {
        await sleep(Math.min(focusGraceMs(), 400));
        const retry = resolveSignalEntryPrice(symbol, provider);
        price = retry.price;
        priceSource = retry.source;
      }

      if (price == null) {
        log.info('Signal price wait (live refresh)', { symbol, waitMs });
        try {
          price = await provider.waitForLivePrice(symbol, Math.min(waitMs, 1500), {
            allowSynthetic: false,
          });
          priceSource = 'wait_live';
        } catch {
          const fallback = resolveSignalEntryPrice(symbol, provider);
          price = fallback.price;
          priceSource = fallback.source ?? 'wait_failed';
        }
      }
    } else {
      price = await provider.getAssetPrice(symbol);
      priceSource = 'provider';
    }
  } catch (e) {
    const code = (e as { code?: string }).code;
    clearFocus(symbol);
    log.warn('Signal price resolution failed', { symbol, code, err: (e as Error).message });
    if (code === 'NO_PRICE') {
      return res.status(422).json({
        error: 'No live price for asset — open this pair on Pocket Option trading chart',
        code: 'NO_PRICE',
      });
    }
    return res.status(503).json({ error: 'DATA SOURCE NOT CONFIGURED', code: 'DATA_SOURCE_NOT_CONFIGURED' });
  }

  if (!price || price <= 0) {
    return res.status(422).json({ error: 'No live price for asset', code: 'NO_PRICE' });
  }

  if (!isPlausibleMarketPrice(price, symbol)) {
    clearFocus(symbol);
    return res.status(422).json({
      error: 'No live price for asset — open this pair on Pocket Option trading chart',
      code: 'NO_PRICE',
    });
  }

  const result = signalEngine.generate({
    assetId,
    symbol,
    timeframe,
    price,
    payout,
    isOTC: isOTC ?? false,
  });

  // Keep bridge focused on this pair until the signal countdown ends (+ buffer).
  if (getMarketMode() === 'platform') {
    const untilExpiry = new Date(result.expiresAt).getTime() - Date.now() + 15_000;
    requestFocus(symbol, Math.max(untilExpiry, 20_000));
  }

  res.json(result);
  log.info('Signal generated', {
    user: user.id,
    symbol,
    direction: result.direction,
    payout,
    priceSource,
    entryPrice: result.entryPrice,
  });
  void prisma.signalHistory
    .create({
      data: {
        id: result.id,
        userId: user.id,
        assetSymbol: result.symbol,
        direction: result.direction,
        timeframe: result.timeframe,
        entryPrice: result.entryPrice,
        confidence: result.confidence,
        payout: result.payout,
        market: result.market,
        expiresAt: new Date(result.expiresAt),
      },
    })
    .catch((err) => log.error('Signal history persist failed', err));
});

/** Fast entry price for martingale coverage — no analysis engine, real PO quote only. */
router.post('/signals/coverage', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.isBanned) return res.status(403).json({ error: 'Banned' });
  if (!hasSignalAccess(user)) return res.status(403).json({ error: 'Access denied', code: 'NO_ACCESS' });

  const symbol = String(req.body?.symbol ?? '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const provider = getMarketProvider();
  if (!provider.status.configured) {
    return res.status(503).json({ error: 'DATA SOURCE NOT CONFIGURED', code: 'DATA_SOURCE_NOT_CONFIGURED' });
  }

  if (getMarketMode() === 'platform') {
    requestFocus(symbol, 60_000);
  }

  try {
    let price: number | null = null;
    let source: string | null = null;

    if (provider instanceof BridgeMarketDataProvider) {
      const resolved = resolveSignalEntryPrice(symbol, provider);
      price = resolved.price;
      source = resolved.source;
      if (price == null) {
        await sleep(250);
        const retry = resolveSignalEntryPrice(symbol, provider);
        price = retry.price;
        source = retry.source;
      }
    } else {
      price = await provider.getAssetPrice(symbol);
      source = 'provider';
    }

    if (price == null || !isPlausibleMarketPrice(price, symbol)) {
      return res.status(422).json({ error: 'No live price for asset', code: 'NO_PRICE' });
    }

    log.info('Coverage entry price', { user: user.id, symbol, price, source });
    return res.json({ symbol, entryPrice: price, source, at: Date.now() });
  } catch (e) {
    log.warn('Coverage price failed', { symbol, err: (e as Error).message });
    return res.status(422).json({ error: 'No live price for asset', code: 'NO_PRICE' });
  }
});

router.get('/signals/history', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasAppAccess(user)) return res.status(403).json({ error: 'Access denied' });
  const signals = await prisma.signalHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(signals);
});

router.post('/calculator', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasAppAccess(user)) return res.status(403).json({ error: 'Access denied' });
  const result = calculateMartingale(
    Number(req.body.deposit) || 0,
    Number(req.body.firstBetPercent) || 1,
    Number(req.body.multiplier) || 2,
    Number(req.body.levels) || 5,
    Number(req.body.payoutPercent) || 80,
  );
  res.json(result);
});

router.get('/news', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasLimitedAccess(user)) return res.status(403).json({ error: 'Access denied' });
  res.json(NEWS);
});

router.get('/indicators', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasLimitedAccess(user)) return res.status(403).json({ error: 'Access denied' });
  res.json(INDICATORS);
});

router.get('/learning', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasLimitedAccess(user)) return res.status(403).json({ error: 'Access denied' });
  res.json(LEARNING);
});

router.post('/vip-request', async (req, res) => {
  const user = await ensureUser(req, res);
  if (!user || !hasAppAccess(user)) return res.status(403).json({ error: 'Basic access required' });
  res.json({ ok: true, message: 'VIP request noted — admin will review' });
});

export default router;
