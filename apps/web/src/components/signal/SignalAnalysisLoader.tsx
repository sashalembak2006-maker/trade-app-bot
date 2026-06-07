import { motion } from 'framer-motion';

interface Props {
  steps: string[];
  activeStep: number;
  title: string;
}

export function SignalAnalysisLoader({ steps, activeStep, title }: Props) {
  return (
    <div className="py-6 text-center">
      <div className="relative mx-auto mb-6 h-28 w-full max-w-[280px] overflow-hidden rounded-2xl border border-prime-gold/20 bg-black/50">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-prime-gold/10 to-transparent"
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-end justify-around px-3 pb-3 pt-8">
          {[32, 48, 28, 56, 40, 52, 36].map((h, i) => (
            <motion.div
              key={i}
              className="w-5 rounded-t bg-gradient-to-t from-neon-purple/80 to-neon-blue/60"
              initial={{ height: h * 0.4 }}
              animate={{ height: [h * 0.45, h, h * 0.55, h * 0.9] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>
        <motion.div
          className="absolute left-0 right-0 top-6 h-0.5 bg-gradient-to-r from-transparent via-neon-green to-transparent"
          animate={{ x: ['-30%', '130%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute left-3 top-2 text-[10px] font-bold text-prime-gold/80">AI SCAN</div>
        <div className="absolute right-3 top-2 text-lg">🤖</div>
      </div>

      <motion.p
        key={title}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 text-sm font-semibold text-prime-gold-light"
      >
        {title}
      </motion.p>

      <div className="mx-auto max-w-[300px] space-y-2 text-left">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0.35, x: -8 }}
            animate={{
              opacity: i <= activeStep ? 1 : 0.35,
              x: i <= activeStep ? 0 : -8,
            }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
              i <= activeStep
                ? 'border border-neon-purple/30 bg-neon-purple/10 text-neon-purple'
                : 'text-slate-600'
            }`}
          >
            <span>{i < activeStep ? '✓' : i === activeStep ? '◉' : '○'}</span>
            <span>{step}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
