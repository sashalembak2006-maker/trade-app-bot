import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export async function resolveTelegramUser(req: Request, res: Response, next: NextFunction) {
  const telegramId = req.headers['x-telegram-id'] || req.query.telegramId || req.body?.telegramId;
  if (!telegramId) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(String(telegramId)) },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
      res.locals.user = user;
    }
  } catch { /* ignore */ }
  next();
}

export function requireTelegramUser(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    return res.status(401).json({ error: 'Telegram user required' });
  }
  next();
}

// Simple admin session via header token (JWT-less MVP)
const adminSessions = new Map<string, { email: string; expires: number }>();

export function createAdminSession(email: string): string {
  const token = `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  adminSessions.set(token, { email, expires: Date.now() + 24 * 60 * 60 * 1000 });
  return token;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (!auth) return res.status(401).json({ error: 'Admin auth required' });

  const session = adminSessions.get(auth);
  if (!session || session.expires < Date.now()) {
    adminSessions.delete(auth ?? '');
    return res.status(401).json({ error: 'Session expired' });
  }
  res.locals.adminEmail = session.email;
  next();
}
