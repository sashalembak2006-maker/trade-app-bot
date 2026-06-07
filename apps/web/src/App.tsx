import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccessGate } from './pages/AccessGate';
import { MainApp } from './pages/MainApp';
import { AdminDashboard } from './pages/AdminDashboard';
import { MarketDataDebug } from './pages/MarketDataDebug';
import { useAppStore } from './store/useAppStore';
import { useTelegram } from './hooks/useTelegram';
import { api, setTelegramProfile, type AccessStatus } from './services/api';
import { initTelegramWebApp } from './services/telegram';
import { loadRuntimeConfig } from './services/runtime-config';

function AppRouter() {
  const { user } = useTelegram();
  const { setAccessStatus, setUserProfile } = useAppStore();
  const [accessStatus, setLocalAccess] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const refreshAccess = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setApiError('');
    try {
      setTelegramProfile(user.id, user.firstName, user.username);
      await api.health();
      await api.sync();
      const access = await api.getAccessStatus();
      const profile = await api.getMe().catch(() => null);
      setLocalAccess(access);
      setAccessStatus(access);
      if (profile) setUserProfile(profile);
      return access;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Помилка зʼєднання з API';
      setApiError(`Не вдалося зʼєднатися з API. Перевірте, що сервер увімкнений (${msg})`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user.id, user.firstName, user.username, setAccessStatus, setUserProfile]);

  useEffect(() => {
    initTelegramWebApp();
    void loadRuntimeConfig().then(() => refreshAccess(true));
  }, [refreshAccess]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-prime-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-prime-gold/30 border-t-prime-gold" />
      </div>
    );
  }

  if (accessStatus?.isBanned || !accessStatus?.hasLimitedAccess) {
    return (
      <AccessGate
        access={accessStatus}
        telegramId={user.id}
        apiError={apiError}
        onRefresh={() => refreshAccess(false)}
      />
    );
  }

  return (
    <MainApp
      limited={!accessStatus?.hasAppAccess}
      access={accessStatus}
      telegramId={user.id}
      apiError={apiError}
      onRefreshAccess={() => refreshAccess(false)}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/market-data" element={<MarketDataDebug />} />
        <Route path="/*" element={<AppRouter />} />
      </Routes>
    </BrowserRouter>
  );
}
