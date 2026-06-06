export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium?: boolean;
}

const DEMO: TelegramUser = {
  id: 847291036,
  firstName: 'Трейдер',
  username: 'trade_pro_ua',
};

export function initTelegramWebApp(): void {
  const wa = window.Telegram?.WebApp;
  if (!wa) return;
  wa.ready();
  wa.expand();
  wa.setHeaderColor('#0a0a12');
  wa.setBackgroundColor('#0a0a12');
}

export function getTelegramUser(): TelegramUser {
  const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!u) return DEMO;
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    username: u.username,
    photoUrl: u.photo_url,
    isPremium: u.is_premium,
  };
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
}

export function hapticSuccess(): void {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
}

export function hapticSelection(): void {
  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
}
