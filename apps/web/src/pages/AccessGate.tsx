import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { AccessStatus } from '../services/api';
import { api } from '../services/api';
import { GoldBackground } from '../components/layout/GoldBackground';
import { GoldParticles } from '../components/layout/GoldParticles';

const isTelegramEnv = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user);

interface Props {
  access: AccessStatus | null;
  telegramId: number;
  apiError?: string;
  onRefresh: () => Promise<unknown>;
  /** Render inside MainApp without full-page shell */
  embedded?: boolean;
}

export function AccessGate({ access, telegramId, apiError, onRefresh, embedded = false }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [platformId, setPlatformId] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleRegister = async () => {
    const id = platformId.trim();
    if (!id) {
      setRegisterError('Вкажіть Pocket Option ID');
      return;
    }
    setRegistering(true);
    setRegisterError('');
    try {
      await api.register(id);
      await onRefresh();
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : 'Помилка реєстрації');
    } finally {
      setRegistering(false);
    }
  };

  const wrap = (content: ReactNode) => (embedded ? <div className="rounded-xl border border-white/10 bg-black/40 p-4">{content}</div> : <Shell>{content}</Shell>);

  if (access?.isBanned) {
    return wrap(
        <div className="text-center">
          <span className="text-5xl">⛔</span>
          <h2 className="mt-4 text-xl font-bold text-red-400">Доступ заблоковано</h2>
        </div>
    );
  }

  if (access && !access.hasLimitedAccess) {
    return wrap(
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <span className="text-5xl">🔒</span>
        <h2 className="mt-4 text-xl font-bold text-gold text-glow-gold">Доступ закритий</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Зверніться до адміністратора або очікуйте запрошення. Після додавання до whitelist відкрийте бота знову.
        </p>
        <button
          type="button"
          disabled={refreshing}
          onClick={handleRefresh}
          className="btn-gold mt-6 w-full rounded-2xl py-3.5 text-sm disabled:opacity-50"
        >
          {refreshing ? 'Перевірка...' : '🔄 Оновити статус'}
        </button>
      </motion.div>
    );
  }

  if (access?.status === 'pending_deposit') {
    return wrap(
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <span className="text-5xl">⏳</span>
          <h2 className="mt-4 text-xl font-bold text-gold text-glow-gold">Очікує підтвердження депозиту</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Ваша заявка надіслана адміністратору. Після підтвердження депозиту доступ відкриється автоматично.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Статус: <span className="font-semibold text-prime-gold">pending_deposit</span>
          </p>
          <button
            type="button"
            disabled={refreshing}
            onClick={handleRefresh}
            className="btn-gold mt-6 w-full rounded-2xl py-3.5 text-sm disabled:opacity-50"
          >
            {refreshing ? 'Перевірка...' : '🔄 Оновити статус'}
          </button>
        </motion.div>
    );
  }

  // guest / registered — show registration form
  return wrap(
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        {apiError && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {apiError}
          </div>
        )}

        <h2 className="text-xl font-bold text-gold text-glow-gold">Реєстрація</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Вкажіть ваш Pocket Option ID. Пароль не потрібен — лише ID акаунта для підтвердження депозиту.
        </p>

        {access && (
          <p className="mt-3 text-xs text-slate-500">
            Статус: <span className="font-semibold text-prime-gold">{access.status}</span>
          </p>
        )}

        {!isTelegramEnv && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Режим браузера (демо). У Telegram буде ваш справжній ID.
          </div>
        )}

        <div className="glass gold-border mt-5 rounded-xl px-4 py-3 text-left">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Ваш Telegram ID</p>
          <p className="mt-1 font-mono text-lg font-bold text-prime-gold">{telegramId}</p>
        </div>

        <div className="mt-4 text-left">
          <label className="text-xs font-semibold text-slate-400">Pocket Option ID</label>
          <input
            type="text"
            value={platformId}
            onChange={(e) => setPlatformId(e.target.value)}
            placeholder="наприклад: 12345678"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-prime-gold/50 focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-slate-600">ID з профілю Pocket Option (не email і не пароль)</p>
        </div>

        {registerError && (
          <p className="mt-3 text-xs text-red-400">{registerError}</p>
        )}

        <button
          type="button"
          disabled={registering}
          onClick={handleRegister}
          className="btn-gold mt-4 w-full rounded-2xl py-3.5 text-sm disabled:opacity-50"
        >
          {registering ? 'Надсилання...' : '📝 Надіслати заявку'}
        </button>

        <button
          type="button"
          disabled={refreshing}
          onClick={handleRefresh}
          className="mt-3 w-full rounded-2xl border border-white/10 py-3 text-sm text-slate-400 hover:bg-white/5 disabled:opacity-50"
        >
          {refreshing ? 'Перевірка...' : '🔄 Оновити статус'}
        </button>
      </motion.div>
      {!embedded && (
        <p className="disclaimer mt-6 text-center">
          Сигнали є аналітичним прогнозом і не є фінансовою порадою. Торгівля повʼязана з ризиком.
        </p>
      )}
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const botUser = import.meta.env.VITE_BOT_USERNAME ?? '@primetradebot';
  return (
    <div className="relative min-h-full">
      <GoldBackground />
      <GoldParticles />
      <div className="relative z-10 mx-auto flex min-h-full max-w-[430px] flex-col px-5 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-prime-gold to-prime-gold-dark text-2xl font-black text-black gold-glow">
            P
          </div>
          <h1 className="font-display text-xl font-extrabold tracking-[0.2em] text-gold text-glow-gold">
            PRIME TRADE BOT
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Premium Trading Terminal</p>
        </motion.div>
        <div className="mt-6 flex-1">{children}</div>
        <p className="mt-4 text-center text-[10px] text-slate-600">{botUser}</p>
      </div>
    </div>
  );
}
