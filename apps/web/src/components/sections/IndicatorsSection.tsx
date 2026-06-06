import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import type { IndicatorInfo } from '../../types';

export function IndicatorsSection() {
  const { language, selectedIndicatorId, setSelectedIndicatorId } = useAppStore();
  const [indicators, setIndicators] = useState<IndicatorInfo[]>([]);

  useEffect(() => {
    api.getIndicators().then(setIndicators).catch(() => setIndicators([]));
  }, []);

  const selected = indicators.find((i) => i.id === selectedIndicatorId);

  return (
    <>
      <div className="space-y-2">
        {indicators.map((ind, i) => (
          <motion.button
            key={ind.id}
            type="button"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelectedIndicatorId(ind.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-left hover:border-neon-purple/20"
          >
            <span className="text-2xl">{ind.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-white">{language === 'uk' ? ind.nameUk : ind.nameEn}</p>
              <p className="text-[10px] text-slate-500">{language === 'uk' ? ind.shortDescUk : ind.shortDescEn}</p>
            </div>
            <span className="text-slate-600">›</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedIndicatorId(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong max-h-[80vh] w-full overflow-y-auto rounded-t-[28px] p-6"
            >
              <button type="button" onClick={() => setSelectedIndicatorId(null)} className="mb-4 text-slate-400">✕</button>
              <span className="text-4xl">{selected.icon}</span>
              <h3 className="mt-2 text-xl font-bold text-white">
                {language === 'uk' ? selected.nameUk : selected.nameEn}
              </h3>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {language === 'uk' ? selected.detailUk : selected.detailEn}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
