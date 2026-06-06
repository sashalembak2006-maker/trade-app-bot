import { useEffect, useState } from 'react';
import { initTelegramWebApp, getTelegramUser } from '../services/telegram';

export function useTelegram() {
  const [user, setUser] = useState(getTelegramUser);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initTelegramWebApp();
    setUser(getTelegramUser());
    setIsReady(true);
  }, []);

  return { user, isReady };
}
