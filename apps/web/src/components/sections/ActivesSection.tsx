import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import { api } from '../../services/api';
import type { AssetCategory } from '../../types';
import { AssetRow } from './AssetRow';

const CATEGORIES: (AssetCategory | 'favorite' | 'all')[] = ['all', 'forex_otc', 'favorite'];

async function focusAndFetchPrice(symbol: string): Promise<number | null> {
  for (let i = 0; i < 6; i++) {
    try {
      const q = await api.getLivePrice(symbol, 350, { timeoutMs: 800 });
      if (q.price != null && q.price > 0) return q.price;
    } catch {
      /* extension switching pair */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export function ActivesSection() {
  const { assets, searchQuery, activeCategory, setActiveCategory, setSelectedAsset, language, toggleFavorite, updateAssetPrice } =
    useAppStore();
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

  const handleSelect = (a: (typeof assets)[0]) => {
    setSelectedAsset(a);
    void api.requestFocus(a.symbol, 120_000).catch(() => {});
    void focusAndFetchPrice(a.symbol).then((price) => {
      if (price == null) return;
      updateAssetPrice(a.symbol, price, a.payout, a.change);
      const cur = useAppStore.getState().selectedAsset;
      if (cur?.symbol === a.symbol) {
        setSelectedAsset({ ...a, price, lastKnownPrice: price });
      }
    });
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
              activeCategory === c
                ? 'border border-prime-gold/35 bg-prime-gold/15 text-prime-gold-light'
                : 'border border-transparent bg-white/5 text-slate-500'
            }`}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-prime-gold/15 bg-black/30 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-400">{t.noAssetsYet}</p>
            <p className="mt-2 text-[11px] text-slate-600">{t.bridgeNotConnectedHint}</p>
          </div>
        )}
        {filtered.map((a, i) => (
          <AssetRow
            key={a.id}
            asset={a}
            index={i}
            catLabel={catLabel(a.category as typeof activeCategory)}
            priceOnSignalStart={t.priceTapForLive}
            onSelect={() => handleSelect(a)}
            onToggleFavorite={() => toggleFavorite(a.symbol)}
          />
        ))}
      </div>
    </div>
  );
}
