import { motion } from 'framer-motion';
import { LEARNING_CARDS } from '../../services/vip';

const levelColors = {
  'Початківець': 'text-neon-green bg-neon-green/10',
  'Середній': 'text-neon-yellow bg-neon-yellow/10',
  'Просунутий': 'text-neon-purple bg-neon-purple/10',
};

export function LearningSection() {
  return (
    <div className="space-y-3">
      {LEARNING_CARDS.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ scale: 1.02, x: 4 }}
          className="cursor-pointer rounded-xl border border-white/5 bg-gradient-to-r from-white/5 to-transparent p-4 transition-shadow hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
        >
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{card.icon}</span>
              <h4 className="font-semibold text-white">{card.title}</h4>
            </div>
            <span className="text-xs text-slate-500">⏱ {card.duration}</span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-400">{card.description}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelColors[card.level]}`}>
            {card.level}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
