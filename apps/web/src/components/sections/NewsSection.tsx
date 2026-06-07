import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import type { NewsItem } from '../../types';
import { NEWS as BUNDLED_NEWS } from '../../data/content';

function renderBody(text: string) {
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

export function NewsSection() {
  const { language } = useAppStore();
  const t = useT(language);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  useEffect(() => {
    setNews(BUNDLED_NEWS as NewsItem[]);
    setLoading(false);
    void api.getNews().then(setNews).catch(() => {});
  }, []);

  if (loading) {
    return <p className="py-6 text-center text-sm text-slate-500">{t.contentLoading}</p>;
  }

  if (news.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{t.contentEmpty}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {news.map((item, i) => (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelected(item)}
            className="w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] text-left transition-all hover:border-prime-gold/25"
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="h-24 w-full object-cover opacity-90" />
            )}
            <div className="p-4">
              <div className="mb-2 flex justify-between gap-2">
                <span className="rounded-full bg-neon-blue/20 px-2 py-0.5 text-[10px] font-bold uppercase text-neon-blue">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-600">
                  {item.date}
                  {item.time ? ` · ${item.time}` : ''}
                </span>
              </div>
              <h4 className="mb-1 font-semibold text-white">{item.title}</h4>
              <p className="text-xs leading-relaxed text-slate-400">{item.summary}</p>
              <p className="mt-2 text-[10px] text-slate-600">{item.source}</p>
            </div>
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
            onClick={() => setSelected(null)}
          >
            <motion.article
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border-t border-prime-gold/20 p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-neon-blue/20 px-2 py-0.5 text-[10px] font-bold uppercase text-neon-blue">
                    {selected.category}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-white">{selected.title}</h3>
                  <p className="text-[10px] text-slate-500">
                    {selected.date}
                    {selected.time ? ` · ${selected.time}` : ''} · {selected.source}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full bg-white/10 px-3 py-1 text-slate-400"
                >
                  ✕
                </button>
              </div>

              {selected.imageUrl && (
                <div className="mb-5 overflow-hidden rounded-2xl border border-prime-gold/20">
                  <img src={selected.imageUrl} alt="" className="w-full object-cover" />
                </div>
              )}

              <p className="mb-4 text-sm text-slate-400">{selected.summary}</p>
              <div>{renderBody(selected.body ?? selected.summary)}</div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
