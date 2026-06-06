import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { MarketDataRow } from '@trade-app/shared';
import { prisma } from '../db.js';
import { log } from '../logger.js';
import { getMarketProvider, getMarketMode, getMarketStatus, getBridgeProvider } from '../market.js';
import { getCollectorStatus, requestCollectorRestart } from '../services/collector-status.js';
import { requireAdmin, createAdminSession } from '../middleware/auth.js';
import { serializeUser } from '../middleware/access.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    log.warn('Admin login failed', { email });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createAdminSession(email);
  log.info('Admin logged in', { email });
  res.json({ token, email });
});

/**
 * Internal endpoint used by the Telegram bot to action deposit-request
 * notification buttons. Protected by a shared secret (INTERNAL_API_SECRET).
 * Registered BEFORE requireAdmin so it is not behind the session guard.
 */
router.post('/internal/deposit/:id/:action', async (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id, action } = req.params;
  const by = `bot:${req.body?.adminTelegramId ?? 'unknown'}`;
  try {
    if (action === 'reject') {
      const request = await prisma.depositRequest.update({
        where: { id },
        data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: by },
      });
      await prisma.user.update({ where: { id: request.userId }, data: { status: 'registered' } });
      log.info('Deposit rejected via bot', { id, by });
      return res.json({ ok: true, action });
    }
    const vip = action === 'approve_vip';
    const user = await approveRequest(id, vip, by);
    if (!user) return res.status(404).json({ error: 'Not found' });
    log.info('Deposit approved via bot', { id, vip, by });
    return res.json({ ok: true, action, user: serializeUser(user) });
  } catch (e) {
    log.error('Internal deposit action failed', e instanceof Error ? e.message : e);
    return res.status(500).json({ error: 'Action failed' });
  }
});

/** Public read-only debug — verify bridge data in the browser (no login needed). */
router.get('/market-data', async (_req, res) => {
  const status = getMarketStatus();
  const bridge = getBridgeProvider();
  let rows: MarketDataRow[] = bridge.rows();
  if (rows.length === 0) {
    try {
      const assets = await getMarketProvider().getAssets();
      rows = assets.map((a) => ({
        symbol: a.symbol,
        price: a.price,
        payout: a.payout,
        source: status.mode === 'mock' ? 'mock' : status.source,
        lastUpdated: status.lastUpdate ?? null,
        stale: status.stale ?? false,
      }));
    } catch {
      rows = [];
    }
  }
  const staleCount = rows.filter((r) => r.stale).length;
  const pricedCount = rows.filter((r) => r.price != null).length;
  res.json({
    mode: getMarketMode(),
    status,
    rows,
    collector: getCollectorStatus(),
    stats: { total: rows.length, pricedCount, staleCount },
  });
});

router.use(requireAdmin);

router.get('/users', async (req, res) => {
  const { status, search, invited } = req.query;
  const invitedFilter = invited === 'true';
  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(invitedFilter
        ? {
            isInvited: true,
            isBanned: false,
            NOT: {
              OR: [
                { status: { in: ['deposited', 'vip'] } },
                { accessLevel: { in: ['basic', 'vip'] } },
                { isVip: true },
              ],
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: String(search) } },
              { firstName: { contains: String(search) } },
              { platformAccountId: { contains: String(search) } },
              ...( /^\d+$/.test(String(search)) ? [{ telegramId: BigInt(String(search)) }] : []),
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { signals: true } } },
  });

  res.json(
    users.map((u) => ({
      ...serializeUser(u),
      signalCount: u._count.signals,
    })),
  );
});

router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      depositRequests: { orderBy: { createdAt: 'desc' } },
      signals: { orderBy: { createdAt: 'desc' }, take: 20 },
      _count: { select: { signals: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...serializeUser(user), depositRequests: user.depositRequests, signals: user.signals, signalCount: user._count.signals });
});

router.patch('/users/:id/status', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { status: req.body.status },
  });
  res.json(serializeUser(user));
});

router.patch('/users/:id/invite', async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  const keepStatus = ['registered', 'pending_deposit', 'deposited', 'vip'].includes(user.status);
  const updated = await prisma.user.update({
    where: { id },
    data: { isInvited: true, ...(keepStatus ? {} : { status: 'guest' }), isBanned: false },
  });
  log.info('Admin invited user', { id, by: res.locals.adminEmail });
  res.json(serializeUser(updated));
});

router.patch('/users/:id/grant', async (req, res) => {
  const level = req.body.level as 'invite' | 'registered' | 'basic' | 'vip' | 'revoke';
  const id = Number(req.params.id);
  const by = res.locals.adminEmail;

  if (level === 'invite') {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const keepStatus = ['registered', 'pending_deposit', 'deposited', 'vip'].includes(existing.status);
    const user = await prisma.user.update({
      where: { id },
      data: { isInvited: true, ...(keepStatus ? {} : { status: 'guest' }), isBanned: false },
    });
    log.info('Admin granted invite', { id, by });
    return res.json(serializeUser(user));
  }

  if (level === 'registered') {
    const user = await prisma.user.update({
      where: { id },
      data: { isInvited: true, status: 'registered', isBanned: false },
    });
    log.info('Admin granted registration', { id, by });
    return res.json(serializeUser(user));
  }

  if (level === 'revoke') {
    const user = await prisma.user.update({
      where: { id },
      data: {
        accessLevel: 'none',
        status: 'guest',
        isVip: false,
        isInvited: false,
        isDepositConfirmed: false,
        isBanned: false,
      },
    });
    log.info('Admin revoked access', { id, by });
    return res.json(serializeUser(user));
  }

  if (level === 'vip') {
    const user = await prisma.user.update({
      where: { id },
      data: { isVip: true, accessLevel: 'vip', status: 'vip', isDepositConfirmed: true, isBanned: false },
    });
    log.info('Admin granted VIP', { id, by });
    return res.json(serializeUser(user));
  }

  const user = await prisma.user.update({
    where: { id },
    data: { accessLevel: 'basic', status: 'deposited', isDepositConfirmed: true, isVip: false, isBanned: false },
  });
  log.info('Admin granted basic access', { id, by });
  res.json(serializeUser(user));
});

router.patch('/users/:id/access', async (req, res) => {
  req.body.level = 'basic';
  const id = Number(req.params.id);
  const user = await prisma.user.update({
    where: { id },
    data: { accessLevel: 'basic', status: 'deposited', isDepositConfirmed: true, isVip: false, isBanned: false },
  });
  res.json(serializeUser(user));
});

router.patch('/users/:id/vip', async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.update({
    where: { id },
    data: { isVip: true, accessLevel: 'vip', status: 'vip', isDepositConfirmed: true, isBanned: false },
  });
  res.json(serializeUser(user));
});

router.patch('/users/:id/deposit', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { depositAmount: Number(req.body.amount) || 0 },
  });
  res.json(serializeUser(user));
});

router.patch('/users/:id/ban', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBanned: true, status: 'banned' },
  });
  log.info('Admin banned user', { id: user.id, by: res.locals.adminEmail });
  res.json(serializeUser(user));
});

router.patch('/users/:id/note', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { adminNote: req.body.note },
  });
  res.json(serializeUser(user));
});

router.patch('/users/:id/unban', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBanned: false, status: 'guest' },
  });
  log.info('Admin unbanned user', { id: user.id, by: res.locals.adminEmail });
  res.json(serializeUser(user));
});

router.get('/deposit-requests', async (req, res) => {
  const statusFilter = req.query.status ? String(req.query.status) : undefined;
  const requests = await prisma.depositRequest.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    requests.map((r) => ({
      ...r,
      user: serializeUser(r.user),
    })),
  );
});

async function approveRequest(requestId: string, vip: boolean, reviewedBy: string) {
  const request = await prisma.depositRequest.findUnique({ where: { id: requestId } });
  if (!request) return null;

  await prisma.depositRequest.update({
    where: { id: requestId },
    data: { status: 'approved', reviewedAt: new Date(), reviewedBy },
  });

  const user = await prisma.user.update({
    where: { id: request.userId },
    data: {
      isDepositConfirmed: true,
      depositAmount: request.amount,
      accessLevel: vip ? 'vip' : 'basic',
      status: vip ? 'vip' : 'deposited',
      isVip: vip,
    },
  });
  return user;
}

router.patch('/deposit-requests/:id/approve', async (req, res) => {
  const user = await approveRequest(req.params.id, false, res.locals.adminEmail);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUser(user));
});

router.patch('/deposit-requests/:id/approve-vip', async (req, res) => {
  const user = await approveRequest(req.params.id, true, res.locals.adminEmail);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUser(user));
});

router.patch('/deposit-requests/:id/reject', async (req, res) => {
  const request = await prisma.depositRequest.update({
    where: { id: req.params.id },
    data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: res.locals.adminEmail },
  });
  await prisma.user.update({
    where: { id: request.userId },
    data: { status: 'registered' },
  });
  res.json(request);
});

router.get('/analytics', async (_req, res) => {
  const [totalUsers, withAccess, vip, pending, signals, deposits, invited, pendingInvite] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        isBanned: false,
        OR: [
          { status: { in: ['deposited', 'vip'] } },
          { accessLevel: { in: ['basic', 'vip'] } },
          { isVip: true },
        ],
      },
    }),
    prisma.user.count({ where: { isVip: true } }),
    prisma.depositRequest.count({ where: { status: 'pending' } }),
    prisma.signalHistory.count(),
    prisma.depositRequest.aggregate({ _sum: { amount: true }, where: { status: 'approved' } }),
    prisma.user.count({ where: { isInvited: true, isBanned: false } }),
    prisma.user.count({
      where: {
        isInvited: true,
        isBanned: false,
        NOT: {
          OR: [
            { status: { in: ['deposited', 'vip'] } },
            { accessLevel: { in: ['basic', 'vip'] } },
            { isVip: true },
          ],
        },
      },
    }),
  ]);

  res.json({
    totalUsers,
    deposited: withAccess,
    vip,
    pendingDeposits: pending,
    totalSignals: signals,
    totalRevenue: deposits._sum.amount ?? 0,
    invited,
    pendingInvite,
  });
});

router.post('/market-data/clear', (_req, res) => {
  getBridgeProvider().clear();
  log.info('Bridge data cleared by admin');
  res.json({ ok: true, status: getMarketStatus() });
});

router.get('/collector/status', (_req, res) => {
  res.json(getCollectorStatus());
});

router.post('/collector/restart', (_req, res) => {
  const status = requestCollectorRestart();
  log.info('Collector restart requested by admin');
  res.json({ ok: true, status });
});

export default router;
