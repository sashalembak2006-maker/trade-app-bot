import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoldBackground } from '../layout/GoldBackground';
import type { Language } from '../../types';

const STORAGE_KEY = 'prime-trade-welcome-v1';

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

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      markWelcomeSeen(telegramId);
      setTimeout(onDone, 700);
    }, 4800);
    return () => clearTimeout(t);
  }, [telegramId, onDone]);

  const lines = uk
    ? {
        greet: 'Вітаємо!',
        sub: 'Ми раді бачити вас у Prime Trade Bot',
        punch: 'Вам сподобається — побачите!',
      }
    : {
        greet: 'Welcome!',
        sub: "We're glad to see you in Prime Trade Bot",
        punch: "You're going to love it — you'll see!",
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
        >
          <GoldBackground />
          <div className="relative z-10 mx-6 max-w-sm text-center">
            <motion.p
              className="text-[11px] font-bold uppercase tracking-[0.35em] text-prime-gold/70"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.2 }}
            >
              PRIME TRADE
            </motion.p>
            <motion.h1
              className="mt-4 text-4xl font-black tracking-tight text-white"
              initial={{ opacity: 0, y: 28, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {lines.greet}
            </motion.h1>
            <motion.p
              className="mt-5 text-base font-medium leading-relaxed text-slate-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.15 }}
            >
              {lines.sub}
            </motion.p>
            <motion.p
              className="mt-3 bg-gradient-to-r from-prime-gold via-[#f5e6a8] to-prime-gold bg-clip-text text-lg font-bold text-transparent"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.85 }}
            >
              {lines.punch}
            </motion.p>
            <motion.div
              className="mx-auto mt-10 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-prime-gold to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: 2.4 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
