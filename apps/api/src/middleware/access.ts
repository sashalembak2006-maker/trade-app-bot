import type { Request, Response, NextFunction } from 'express';
import type { User } from '@prisma/client';

export type UserStatus =
  | 'guest'
  | 'registered'
  | 'pending_deposit'
  | 'pending_review'
  | 'deposited'
  | 'vip'
  | 'banned';

export function serializeUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    platformAccountId: user.platformAccountId,
    referralCode: user.referralCode,
    status: user.status as UserStatus,
    accessLevel: user.accessLevel,
    depositAmount: user.depositAmount,
    isDepositConfirmed: user.isDepositConfirmed,
    isVip: user.isVip,
    isInvited: user.isInvited,
    isBanned: user.isBanned,
    adminNote: user.adminNote,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    signalCount: undefined as number | undefined,
  };
}

/** Temporary: allow all non-banned users while bot is in development. Set OPEN_ACCESS=false before sale. */
function isOpenAccessMode(): boolean {
  const v = process.env.OPEN_ACCESS?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function hasAppAccess(user: User): boolean {
  if (user.isBanned) return false;
  if (isOpenAccessMode()) return true;
  return (
    user.status === 'deposited' ||
    user.status === 'vip' ||
    user.accessLevel === 'basic' ||
    user.accessLevel === 'vip' ||
    user.isVip
  );
}

/** Non-banned invited users or those with full app access may open the Mini App. */
export function hasLimitedAccess(user: User): boolean {
  if (user.isBanned) return false;
  if (isOpenAccessMode()) return true;
  return user.isInvited || hasAppAccess(user);
}

export function hasSignalAccess(user: User): boolean {
  if (user.isBanned) return false;
  if (isOpenAccessMode()) return true;
  return hasAppAccess(user);
}

export function hasVipAccess(user: User): boolean {
  if (user.isBanned) return false;
  return user.isVip || user.accessLevel === 'vip' || user.status === 'vip';
}

export function requireAccess(req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user as User | undefined;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.isBanned) return res.status(403).json({ error: 'Account banned' });
  if (!hasAppAccess(user)) {
    return res.status(403).json({ error: 'Deposit required for access', code: 'NO_ACCESS' });
  }
  next();
}

export function requireVip(req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user as User | undefined;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!hasVipAccess(user)) {
    return res.status(403).json({ error: 'VIP access required', code: 'NO_VIP' });
  }
  next();
}
