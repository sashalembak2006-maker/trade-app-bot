import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { filterAssets } from '../../services/assets';
import { MiniChart } from '../charts/MiniChart';

interface ActivesSectionProps {
  searchQuery: string;
}

export function ActivesSection({ searchQuery }: ActivesSectionProps) {
  const [otcOnly, setOtcOnly] = useState(false);
  const assets = useMemo(() => filterAssets(searchQuery, otcOnly), [searchQuery, otcOnly]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOtcOnly(false)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${!otcOnly ? 'bg-neon-purple/30 text-neon-purple' : 'bg-white/5 text-slate-400'}`}
        >
          Усі активи
        </button>
        <button
          type="button"
          onClick={() => setOtcOnly(true)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${otcOnly ? 'bg-neon-yellow/20 text-neon-yellow' : 'bg-white/5 text-slate-400'}`}
        >
          OTC
        </button>
      </div>

      <div className="space-y-2">
        {assets.map((asset, i) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-3"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{asset.symbol}</span>
                  {asset.isOtc && (
                    <span className="rounded bg-neon-yellow/20 px-1.5 py-0.5 text-[10px] font-bold text-neon-yellow">
                      OTC
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{asset.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MiniChart trend={asset.trend} />
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {asset.price.toLocaleString('uk-UA', { maximumFractionDigits: 4 })}
                </div>
                <div
                  className={`text-xs font-semibold ${asset.change >= 0 ? 'text-neon-green' : 'text-red-400'}`}
                >
                  {asset.change >= 0 ? '+' : ''}
                  {asset.change}%
                </div>
                <div className="text-[10px] font-bold text-neon-green">
                  +{asset.profit}% прибутку
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {assets.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">Активи не знайдено</p>
        )}
      </div>
    </div>
  );
}
