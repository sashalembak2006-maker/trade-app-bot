import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoldBackground } from '../layout/GoldBackground';
import type { Language } from '../../types';

const STORAGE_KEY = 'prime-trade-welcome-v2';
const AUTO_DISMISS_MS = 3200;

export function welcomeStorageKey(telegramId?: number) {
  return telegramId ? `${STORAGE_KEY}-${telegramId}` : STORAGE_KEY;
}

export function hasSeenWelcome(telegramId?: number) {
  try {
    return localStorage.getItem(welcomeStorageKey(telegramId)) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen(telegramId?: number) {
  try {
    localStorage.setItem(welcomeStorageKey(telegramId), '1');
  } catch {
    /* private mode */
  }
}

interface WelcomeSplashProps {
  language: Language;
  telegramId?: number;
  onDone: () => void;
}

export function WelcomeSplash({ language, telegramId, onDone }: WelcomeSplashProps) {
  const [visible, setVisible] = useState(true);
  const uk = language === 'uk';

  const dismiss = useCallback(() => {
    markWelcomeSeen(telegramId);
    setVisible(false);
  }, [telegramId]);

  useEffect(() => {
    const t = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [dismiss]);

  const lines = uk
    ? {
        greet: 'Вітаємо!',
        sub: 'Ми раді бачити вас у Prime Trade Bot',
        punch: 'Вам сподобається — побачите!',
        tap: 'Натисніть, щоб продовжити',
      }
    : {
        greet: 'Welcome!',
        sub: "We're glad to see you in Prime Trade Bot",
        punch: "You're going to love it — you'll see!",
        tap: 'Tap to continue',
      };

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.button
          type="button"
          aria-label={lines.tap}
          onClick={dismiss}
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden border-0 bg-transparent p-0"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          <GoldBackground />
          <div className="relative z-10 mx-6 max-w-sm text-center pointer-events-none">
            <motion.p
              className="font-display text-[10px] font-semibold uppercase tracking-[0.45em] text-prime-gold/75"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
            >
              PRIME TRADE
            </motion.p>
            <motion.h1
              className="font-display mt-5 text-[2.75rem] font-bold leading-none tracking-wide text-white drop-shadow-[0_0_28px_rgba(212,175,55,0.25)]"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {lines.greet}
            </motion.h1>
            <motion.p
              className="font-serif mt-6 text-xl font-medium leading-snug text-slate-200/95"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.95 }}
            >
              {lines.sub}
            </motion.p>
            <motion.p
              className="font-display mt-4 text-base font-semibold tracking-wide text-prime-gold-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 1.45 }}
            >
              {lines.punch}
            </motion.p>
            <motion.p
              className="mt-8 text-[10px] uppercase tracking-[0.2em] text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.6 }}
            >
              {lines.tap}
            </motion.p>
            <motion.div
              className="mx-auto mt-6 h-px w-20 bg-gradient-to-r from-transparent via-prime-gold/80 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 1.8 }}
            />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
