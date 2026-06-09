import { motion } from 'framer-motion';
import type { Asset } from '../../types';
import { useAssetTickPrice } from '../../hooks/useAssetTickPrice';
import { formatPercentChange } from '../../utils/format';
import { isPlausibleAssetPrice } from '../../utils/price-validation';
import { AssetIcon } from '../ui/AssetIcon';

interface AssetRowProps {
  asset: Asset;
  index: number;
  catLabel: string;
  priceOnSignalStart: string;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

function AssetRow({
  asset: a,
  index: i,
  catLabel,
  priceOnSignalStart,
  onSelect,
  onToggleFavorite,
}: AssetRowProps) {
  const rawAnchor = a.lastKnownPrice ?? a.price;
  const seedPrice =
    a.price != null && isPlausibleAssetPrice(a.price, a.symbol)
      ? a.price
      : rawAnchor != null && isPlausibleAssetPrice(rawAnchor, a.symbol)
        ? rawAnchor
        : null;
  const { price: tickPrice, payout: tickPayout } = useAssetTickPrice(a.symbol, seedPrice, a.payout);
  const displayPrice = tickPrice;
  const displayPayout = tickPayout;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.05] to-transparent p-3 text-left transition-all hover:border-prime-gold/25 hover:from-prime-gold/[0.06]"
    >
      <div className="flex items-center gap-3">
        <AssetIcon flags={a.flags} />
        <div>
          <p className="text-sm font-bold text-white">{a.symbol}</p>
          <p className="text-[10px] text-slate-500">{catLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          {displayPrice != null ? (
            <motion.p
              key={Math.round(displayPrice * 100_000)}
              initial={{ opacity: 0.85, y: -1 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-sm font-semibold tracking-wide text-prime-gold-light"
            >
              {displayPrice.toLocaleString('uk-UA', { maximumFractionDigits: 5 })}
            </motion.p>
          ) : (
            <p className="text-[10px] text-slate-600">{priceOnSignalStart}</p>
          )}
          <p className="text-xs font-bold text-prime-gold">{displayPayout}%</p>
          {displayPrice != null && (
            <p className={`text-[10px] font-semibold ${a.change >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
              {formatPercentChange(a.change)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="text-sm text-prime-gold/80"
        >
          {a.favorite ? '★' : '☆'}
        </button>
        <span className="text-slate-600">›</span>
      </div>
    </motion.button>
  );
}

export { AssetRow };
