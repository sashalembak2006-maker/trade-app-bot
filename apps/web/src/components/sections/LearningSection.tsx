import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import type { LearningArticle } from '../../types';

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
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
              tab === tb
                ? 'border border-prime-gold/40 bg-prime-gold/15 text-prime-gold-light'
                : 'border border-white/5 bg-white/[0.04] text-slate-500'
            }`}
          >
            {tb === 'basics' ? `📖 ${t.basics}` : `📚 ${t.books}`}
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
            className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-left transition-all hover:border-prime-gold/25 hover:bg-white/[0.06]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prime-gold/10 text-xl">
              {a.icon ?? (a.tab === 'books' ? '📕' : '📝')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{language === 'uk' ? a.titleUk : a.titleEn}</p>
              <p className="text-[10px] text-slate-500">⏱ {a.duration}{a.guideUrl ? ' · PDF' : ''}</p>
            </div>
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
            onClick={() => setSelectedArticleId(null)}
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
                  <span className="text-3xl">{selected.icon ?? '📖'}</span>
                  <h3 className="text-lg font-bold text-white">
                    {language === 'uk' ? selected.titleUk : selected.titleEn}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticleId(null)}
                  className="rounded-full bg-white/10 px-3 py-1 text-slate-400"
                >
                  ✕
                </button>
              </div>

              {selected.guideUrl && (
                <a
                  href={selected.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold mb-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm"
                >
                  📥 Відкрити PDF-гайд (зберегти через Друк)
                </a>
              )}

              <div className="space-y-0.5">
                {renderContent(language === 'uk' ? selected.contentUk : selected.contentEn)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
