import { useEffect, useState } from 'react';
import type { TelegramUser } from '../types';
import { getTelegramUser, initTelegramWebApp } from '../services/telegram';

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser>(() => getTelegramUser());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initTelegramWebApp();
    setUser(getTelegramUser());
    setIsReady(true);
  }, []);

  return { user, isReady };
}
