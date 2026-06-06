import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import type { LearningArticle } from '../../types';

export function LearningSection() {
  const { language, selectedArticleId, setSelectedArticleId } = useAppStore();
  const t = useT(language);
  const [articles, setArticles] = useState<LearningArticle[]>([]);
  const [tab, setTab] = useState<'basics' | 'books'>('basics');

  useEffect(() => {
    api.getLearning().then(setArticles).catch(() => setArticles([]));
  }, []);

  const filtered = articles.filter((a) => a.tab === tab);
  const selected = articles.find((a) => a.id === selectedArticleId);

  return (
    <>
      <div className="mb-3 flex gap-2">
        {(['basics', 'books'] as const).map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold ${
              tab === tb ? 'bg-neon-blue/20 text-neon-blue' : 'bg-white/5 text-slate-500'
            }`}
          >
            {tb === 'basics' ? t.basics : t.books}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((a, i) => (
          <motion.button
            key={a.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedArticleId(a.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-left hover:border-neon-blue/20"
          >
            <div>
              <p className="font-semibold text-white">{language === 'uk' ? a.titleUk : a.titleEn}</p>
              <p className="text-[10px] text-slate-500">⏱ {a.duration}</p>
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
            onClick={() => setSelectedArticleId(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] p-6"
            >
              <button type="button" onClick={() => setSelectedArticleId(null)} className="mb-4 text-slate-400">✕</button>
              <h3 className="mb-4 text-xl font-bold text-white">
                {language === 'uk' ? selected.titleUk : selected.titleEn}
              </h3>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {language === 'uk' ? selected.contentUk : selected.contentEn}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
