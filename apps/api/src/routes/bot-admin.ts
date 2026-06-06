import { Router } from 'express';
import { prisma } from '../db.js';
import { log } from '../logger.js';
import { serializeUser } from '../middleware/access.js';
import { getMarketStatus } from '../market.js';
import { getCollectorStatus } from '../services/collector-status.js';

const router = Router();

function requireInternalSecret(req: { headers: Record<string, unknown> }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(requireInternalSecret);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', market: getMarketStatus(), collector: getCollectorStatus() });
});

router.get('/users', async (req, res) => {
  const { status, search, limit, invited } = req.query;
  const take = Math.min(Number(limit) || 20, 50);
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
    take,
    include: { _count: { select: { signals: true } } },
  });
  res.json(users.map((u) => ({ ...serializeUser(u), signalCount: u._count.signals })));
});

router.get('/deposit-requests', async (req, res) => {
  const status = String(req.query.status ?? 'pending');
  const requests = await prisma.depositRequest.findMany({
    where: { status },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(requests.map((r) => ({ ...r, user: serializeUser(r.user) })));
});

router.get('/analytics', async (_req, res) => {
  const [totalUsers, withAccess, vip, pendingDeposits, pendingDepositUsers, signals, invited, pendingInvite] =
    await Promise.all([
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
      prisma.user.count({ where: { status: 'pending_deposit' } }),
      prisma.signalHistory.count(),
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
    withAccess,
    vip,
    pendingDeposits,
    pendingDepositUsers,
    totalSignals: signals,
    invited,
    pendingInvite,
  });
});

async function findUserByTelegramId(telegramId: string) {
  return prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
}

router.post('/users/:telegramId/invite', async (req, res) => {
  const user = await findUserByTelegramId(req.params.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const by = `bot:${req.body?.adminTelegramId ?? 'unknown'}`;
  const keepStatus = ['registered', 'pending_deposit', 'deposited', 'vip'].includes(user.status);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isInvited: true, ...(keepStatus ? {} : { status: 'guest' }), isBanned: false },
  });
  log.info('Bot invited user', { telegramId: req.params.telegramId, by });
  res.json(serializeUser(updated));
});

router.post('/users/:telegramId/grant', async (req, res) => {
  const user = await findUserByTelegramId(req.params.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const level = req.body?.level as 'invite' | 'registered' | 'basic' | 'vip' | 'revoke';
  const by = `bot:${req.body?.adminTelegramId ?? 'unknown'}`;

  if (level === 'invite') {
    const keepStatus = ['registered', 'pending_deposit', 'deposited', 'vip'].includes(user.status);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isInvited: true, ...(keepStatus ? {} : { status: 'guest' }), isBanned: false },
    });
    log.info('Bot granted invite', { telegramId: req.params.telegramId, by });
    return res.json(serializeUser(updated));
  }

  if (level === 'registered') {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isInvited: true, status: 'registered', isBanned: false },
    });
    log.info('Bot granted registration', { telegramId: req.params.telegramId, by });
    return res.json(serializeUser(updated));
  }

  if (level === 'revoke') {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        accessLevel: 'none',
        status: 'guest',
        isVip: false,
        isInvited: false,
        isDepositConfirmed: false,
        isBanned: false,
      },
    });
    log.info('Bot revoked access', { telegramId: req.params.telegramId, by });
    return res.json(serializeUser(updated));
  }
  if (level === 'vip') {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isVip: true, accessLevel: 'vip', status: 'vip', isDepositConfirmed: true, isBanned: false },
    });
    log.info('Bot granted VIP', { telegramId: req.params.telegramId, by });
    return res.json(serializeUser(updated));
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { accessLevel: 'basic', status: 'deposited', isDepositConfirmed: true, isVip: false, isBanned: false },
  });
  log.info('Bot granted basic', { telegramId: req.params.telegramId, by });
  res.json(serializeUser(updated));
});

router.post('/users/:telegramId/ban', async (req, res) => {
  const user = await findUserByTelegramId(req.params.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isBanned: true, status: 'banned' },
  });
  log.info('Bot banned user', { telegramId: req.params.telegramId });
  res.json(serializeUser(updated));
});

router.post('/users/:telegramId/unban', async (req, res) => {
  const user = await findUserByTelegramId(req.params.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isBanned: false, status: 'guest' },
  });
  res.json(serializeUser(updated));
});

async function approveRequest(requestId: string, vip: boolean, reviewedBy: string) {
  const request = await prisma.depositRequest.findUnique({ where: { id: requestId } });
  if (!request) return null;
  await prisma.depositRequest.update({
    where: { id: requestId },
    data: { status: 'approved', reviewedAt: new Date(), reviewedBy },
  });
  return prisma.user.update({
    where: { id: request.userId },
    data: {
      isDepositConfirmed: true,
      depositAmount: request.amount,
      accessLevel: vip ? 'vip' : 'basic',
      status: vip ? 'vip' : 'deposited',
      isVip: vip,
    },
  });
}

router.post('/deposit-requests/:id/approve', async (req, res) => {
  const user = await approveRequest(req.params.id, false, `bot:${req.body?.adminTelegramId ?? 'unknown'}`);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUser(user));
});

router.post('/deposit-requests/:id/approve-vip', async (req, res) => {
  const user = await approveRequest(req.params.id, true, `bot:${req.body?.adminTelegramId ?? 'unknown'}`);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUser(user));
});

router.post('/deposit-requests/:id/reject', async (req, res) => {
  const request = await prisma.depositRequest.update({
    where: { id: req.params.id },
    data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: `bot:${req.body?.adminTelegramId ?? 'unknown'}` },
  });
  await prisma.user.update({ where: { id: request.userId }, data: { status: 'registered' } });
  res.json(request);
});

/** Returns telegram IDs for broadcast (all non-banned users with access, or all users). */
router.get('/broadcast-targets', async (req, res) => {
  const mode = String(req.query.mode ?? 'active');
  const users = await prisma.user.findMany({
    where: mode === 'all'
      ? { isBanned: false }
      : {
          isBanned: false,
          OR: [
            { status: { in: ['deposited', 'vip'] } },
            { accessLevel: { in: ['basic', 'vip'] } },
          ],
        },
    select: { telegramId: true },
  });
  res.json({ count: users.length, telegramIds: users.map((u) => u.telegramId.toString()) });
});

export default router;
