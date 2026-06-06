import type { TelegramUser } from '../types';

const DEMO_USER: TelegramUser = {
  id: 847291036,
  firstName: 'Трейдер',
  lastName: 'Pro',
  username: 'trade_pro_ua',
  photoUrl: undefined,
  isPremium: false,
  languageCode: 'uk',
};

export function initTelegramWebApp(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor('#0a0a12');
  webApp.setBackgroundColor('#0a0a12');
  webApp.enableClosingConfirmation();
}

export function getTelegramUser(): TelegramUser {
  const webApp = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;

  if (!user) return DEMO_USER;

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
    isPremium: user.is_premium,
    languageCode: user.language_code,
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

export function isTelegramEnvironment(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData);
}
