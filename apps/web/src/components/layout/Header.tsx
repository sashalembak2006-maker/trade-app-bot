import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import { AssetTicker } from '../ui/AssetTicker';

export function Header() {
  const { language, searchQuery, setSearchQuery, setLanguage, setShowVipModal, accessStatus } = useAppStore();
  const t = useT(language);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 glass-strong border-b border-prime-gold/10 px-4 pb-3 pt-3"
    >
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-sm font-extrabold tracking-[0.15em] text-gold text-glow-gold">
          PRIME TRADE BOT
        </h1>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowVipModal(true)}
            className="btn-gold rounded-xl px-3 py-1.5 text-[10px] font-extrabold"
          >
            👑 VIP ДОСТУП
          </motion.button>
          <button
            type="button"
            onClick={() => setLanguage(language === 'uk' ? 'en' : 'uk')}
            className="glass rounded-lg px-2 py-1.5 text-[10px] font-bold text-prime-gold"
          >
            {language === 'uk' ? '🇺🇦' : '🇬🇧'}
          </button>
        </div>
      </div>

      {accessStatus?.isVip && (
        <div className="mb-2 rounded-lg bg-prime-gold/10 px-2 py-1 text-center text-[10px] font-bold text-prime-gold">
          ⭐ VIP ACTIVE
        </div>
      )}

      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-50">🔍</span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.search}
          className="w-full rounded-2xl border border-prime-gold/15 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-prime-gold/40"
        />
      </div>

      <AssetTicker />
    </motion.header>
  );
}
