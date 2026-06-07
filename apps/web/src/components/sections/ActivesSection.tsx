import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import { api } from '../../services/api';
import { formatPercentChange } from '../../utils/format';
import type { AssetCategory } from '../../types';
import { AssetIcon } from '../ui/AssetIcon';

const CATEGORIES: (AssetCategory | 'favorite' | 'all')[] = ['all', 'forex_otc', 'favorite'];

export function ActivesSection() {
  const { assets, searchQuery, activeCategory, setActiveCategory, setSelectedAsset, language, toggleFavorite } = useAppStore();
  const t = useT(language);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return assets.filter((a) => {
      if (activeCategory === 'favorite' && !a.favorite) return false;
      if (activeCategory !== 'all' && activeCategory !== 'favorite' && a.category !== activeCategory) return false;
      if (q && !a.symbol.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, searchQuery, activeCategory]);

  const catLabel = (c: typeof activeCategory) => {
    if (c === 'all') return t.all;
    return t[c as keyof typeof t] as string ?? c;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all ${
              activeCategory === c ? 'bg-neon-purple/30 text-neon-purple' : 'bg-white/5 text-slate-500'
            }`}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-400">{t.noAssetsYet}</p>
            <p className="mt-2 text-[11px] text-slate-600">{t.bridgeNotConnectedHint}</p>
          </div>
        )}
        {filtered.map((a, i) => (
          <motion.button
            key={a.id}
            type="button"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedAsset(a);
              void api.requestFocus(a.symbol, 90_000).catch(() => {});
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.05] to-transparent p-3 text-left transition-all hover:border-prime-gold/25 hover:from-prime-gold/[0.06]"
          >
            <div className="flex items-center gap-3">
              <AssetIcon flags={a.flags} />
              <div>
                <p className="text-sm font-bold text-white">{a.symbol}</p>
                <p className="text-[10px] text-slate-500">{catLabel(a.category as typeof activeCategory)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                {a.price != null ? (
                  <p className="text-sm font-semibold text-white">
                    {a.price.toLocaleString('uk-UA', { maximumFractionDigits: 5 })}
                  </p>
                ) : a.lastKnownPrice != null ? (
                  <p className="text-sm font-semibold text-slate-500">
                    {a.lastKnownPrice.toLocaleString('uk-UA', { maximumFractionDigits: 5 })}
                    <span className="ml-1 text-[9px] text-slate-600">({t.lastKnownPrice})</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-600">{t.priceOnSignalStart}</p>
                )}
                <p className="text-xs font-bold text-neon-yellow">{a.payout}%</p>
                {(a.price != null || a.lastKnownPrice != null) && (
                  <p className={`text-[10px] font-semibold ${a.change >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                    {formatPercentChange(a.change)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleFavorite(a.symbol); }}
                className="text-sm"
              >
                {a.favorite ? '⭐' : '☆'}
              </button>
              <span className="text-slate-600">›</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
