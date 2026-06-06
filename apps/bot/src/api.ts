const apiUrl = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const internalSecret = process.env.INTERNAL_API_SECRET ?? '';

export async function apiCall<T = unknown>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
  adminTelegramId?: string,
): Promise<T> {
  if (!internalSecret) throw new Error('INTERNAL_API_SECRET not configured');

  const res = await fetch(`${apiUrl}/api/bot-admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: body ? JSON.stringify({ ...body, adminTelegramId }) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type SyncedUser = {
  status: string;
  isBanned: boolean;
  isVip: boolean;
  isInvited: boolean;
  hasAppAccess?: boolean;
  hasLimitedAccess?: boolean;
  telegramId: string;
  firstName?: string;
  username?: string;
  platformAccountId?: string;
};

export async function syncUser(
  telegramId: number,
  profile: { first_name: string; last_name?: string; username?: string },
): Promise<SyncedUser | null> {
  const res = await fetch(`${apiUrl}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-id': String(telegramId),
    },
    body: JSON.stringify({
      telegramId,
      firstName: profile.first_name,
      lastName: profile.last_name,
      username: profile.username,
    }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<SyncedUser>;
}

export async function inviteUser(telegramId: string, adminTelegramId: string) {
  return apiCall(`/users/${telegramId}/invite`, 'POST', {}, adminTelegramId);
}

export async function claimDeposit(telegramId: number) {
  const res = await fetch(`${apiUrl}/api/deposit-claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-id': String(telegramId),
    },
    body: '{}',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string; code?: string }).error ?? `API ${res.status}`);
  }
  return res.json();
}
