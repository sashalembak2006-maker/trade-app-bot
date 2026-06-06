import { motion } from 'framer-motion';

interface SentimentGaugeProps {
  value: number;
  label?: string;
}

export function SentimentGauge({ value, label = 'Настрій ринку' }: SentimentGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const rotation = (clamped / 100) * 180 - 90;
  const color =
    clamped > 60 ? '#22c55e' : clamped < 40 ? '#ef4444' : '#f5e642';

  return (
    <div className="flex flex-col items-center">
      <span className="mb-2 text-xs text-slate-400">{label}</span>
      <div className="relative h-20 w-36 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-20 w-36 rounded-t-full border-4 border-slate-700/50" />
        <div
          className="absolute inset-x-0 bottom-0 h-20 w-36 rounded-t-full opacity-30"
          style={{
            background: `conic-gradient(from 180deg at 50% 100%, #ef4444 0deg, #f5e642 90deg, #22c55e 180deg)`,
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{ width: 3, height: 60, marginLeft: -1.5, background: color }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        />
        <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow-lg" />
      </div>
      <motion.span
        className="mt-1 text-lg font-bold"
        style={{ color }}
        key={clamped}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        {clamped}%
      </motion.span>
    </div>
  );
}
