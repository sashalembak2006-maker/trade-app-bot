import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import type { IndicatorInfo } from '../../types';
import { INDICATORS as BUNDLED_INDICATORS } from '../../data/content';

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('━━━')) {
      return (
        <p key={i} className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-prime-gold/90">
          {line.replace(/━/g, '').trim()}
        </p>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm leading-relaxed text-slate-300">
        {line}
      </p>
    );
  });
}

export function IndicatorsSection() {
  const { language, selectedIndicatorId, setSelectedIndicatorId } = useAppStore();
  const t = useT(language);
  const [indicators, setIndicators] = useState<IndicatorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIndicators(BUNDLED_INDICATORS as IndicatorInfo[]);
    setLoading(false);
    void api.getIndicators().then(setIndicators).catch(() => {});
  }, []);

  const selected = indicators.find((i) => i.id === selectedIndicatorId);

  if (loading) {
    return <p className="py-6 text-center text-sm text-slate-500">{t.contentLoading}</p>;
  }

  if (indicators.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{t.contentEmpty}</p>;
  }

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
            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-left transition-all hover:border-prime-gold/25 hover:bg-white/[0.06]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prime-gold/10 text-xl">
              {ind.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{language === 'uk' ? ind.nameUk : ind.nameEn}</p>
              <p className="text-[10px] text-slate-500">{language === 'uk' ? ind.shortDescUk : ind.shortDescEn}</p>
            </div>
            {ind.imageUrl && (
              <img
                src={ind.imageUrl}
                alt=""
                className="h-10 w-16 shrink-0 rounded-lg border border-white/10 object-cover opacity-80"
              />
            )}
            <span className="text-prime-gold/50">›</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedIndicatorId(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border-t border-prime-gold/20 p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selected.icon}</span>
                  <h3 className="text-lg font-bold text-white">
                    {language === 'uk' ? selected.nameUk : selected.nameEn}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIndicatorId(null)}
                  className="rounded-full bg-white/10 px-3 py-1 text-slate-400"
                >
                  ✕
                </button>
              </div>

              {selected.imageUrl && (
                <div className="mb-5 overflow-hidden rounded-2xl border border-prime-gold/20 bg-black/40 shadow-lg shadow-prime-gold/5">
                  <img
                    src={selected.imageUrl}
                    alt={language === 'uk' ? selected.nameUk : selected.nameEn}
                    className="w-full max-h-64 object-contain p-4"
                  />
                </div>
              )}

              <div className="space-y-0.5">
                {renderContent(language === 'uk' ? selected.detailUk : selected.detailEn)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
