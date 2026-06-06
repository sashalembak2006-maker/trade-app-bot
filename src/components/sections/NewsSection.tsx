import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_LABELS, NEWS_ITEMS } from '../../services/news';
import type { NewsCategory } from '../../types';

const categories: (NewsCategory | 'all')[] = ['all', 'forex', 'crypto', 'economy'];

export function NewsSection() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');

  const filtered =
    activeCategory === 'all'
      ? NEWS_ITEMS
      : NEWS_ITEMS.filter((n) => n.category === activeCategory);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-neon-purple/30 text-neon-purple'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {cat === 'all' ? 'Усі' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.map((item, i) => (
          <motion.article
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className="overflow-hidden rounded-xl border border-white/5"
          >
            <div className={`h-2 bg-gradient-to-r ${item.imageGradient}`} />
            <div className="bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-neon-blue/20 px-2 py-0.5 text-[10px] font-semibold text-neon-blue">
                  {CATEGORY_LABELS[item.category]}
                </span>
                <span className="text-[10px] text-slate-500">{item.date}</span>
              </div>
              <h4 className="mb-2 font-semibold text-white">{item.title}</h4>
              <p className="mb-2 text-xs leading-relaxed text-slate-400">{item.summary}</p>
              <span className="text-[10px] text-slate-600">{item.source}</span>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
