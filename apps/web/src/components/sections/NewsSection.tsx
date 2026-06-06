import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import type { NewsItem } from '../../types';

export function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    api.getNews().then(setNews).catch(() => setNews([]));
  }, []);

  return (
    <div className="space-y-3">
      {news.map((item, i) => (
        <motion.article
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04]"
        >
          <div className="h-1 bg-gradient-to-r from-neon-purple to-neon-blue" />
          <div className="p-4">
            <div className="mb-2 flex justify-between">
              <span className="rounded-full bg-neon-blue/20 px-2 py-0.5 text-[10px] font-bold text-neon-blue">
                {item.category}
              </span>
              <span className="text-[10px] text-slate-600">{item.date}</span>
            </div>
            <h4 className="mb-1 font-semibold text-white">{item.title}</h4>
            <p className="text-xs leading-relaxed text-slate-400">{item.summary}</p>
            <p className="mt-2 text-[10px] text-slate-600">{item.source}</p>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
