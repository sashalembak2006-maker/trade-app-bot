import { motion } from 'framer-motion';
import { INDICATORS } from '../../services/indicators';

const colorMap = {
  yellow: 'neon-border-yellow text-neon-yellow',
  purple: 'neon-border-purple text-neon-purple',
  green: 'neon-border-green text-neon-green',
  blue: 'neon-border-blue text-neon-blue',
};

const signalLabels = {
  bullish: { text: 'Бичачий', color: 'text-neon-green bg-neon-green/10' },
  bearish: { text: 'Ведмежий', color: 'text-red-400 bg-red-400/10' },
  neutral: { text: 'Нейтральний', color: 'text-neon-yellow bg-neon-yellow/10' },
};

export function IndicatorsSection() {
  return (
    <div className="space-y-3">
      {INDICATORS.map((ind, i) => (
        <motion.div
          key={ind.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`rounded-xl p-4 ${colorMap[ind.color].split(' ')[0]} bg-white/5`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h4 className={`font-bold ${colorMap[ind.color].split(' ')[1]}`}>{ind.shortName}</h4>
              <span className="text-[10px] text-slate-500">{ind.name}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">{ind.value}</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${signalLabels[ind.signal].color}`}>
                {signalLabels[ind.signal].text}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">{ind.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
