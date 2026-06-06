import { motion } from 'framer-motion';
import { AssetTicker } from '../ui/AssetTicker';
import { SearchBar } from '../ui/SearchBar';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onVipClick: () => void;
  onProfileClick: () => void;
}

export function Header({ searchQuery, onSearchChange, onVipClick, onProfileClick }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 glass-strong border-b border-white/5 px-4 pb-3 pt-3"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue text-sm font-bold"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            T
          </motion.div>
          <div>
            <h1 className="font-display text-sm font-bold tracking-wider text-glow-yellow text-neon-yellow">
              TRADE APP BOT
            </h1>
            <p className="text-[10px] text-slate-500">Pocket Option Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={onVipClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg bg-gradient-to-r from-neon-yellow/90 to-yellow-500 px-3 py-1.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(245,230,66,0.4)]"
          >
            ⭐ VIP
          </motion.button>

          <button
            type="button"
            className="glass rounded-lg px-2.5 py-1.5 text-xs font-medium text-white"
          >
            🇺🇦 UA
          </button>

          <motion.button
            type="button"
            onClick={onProfileClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neon-purple/40 bg-neon-purple/20 text-sm"
          >
            👤
          </motion.button>
        </div>
      </div>

      <div className="mb-3">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
      </div>

      <AssetTicker />
    </motion.header>
  );
}
