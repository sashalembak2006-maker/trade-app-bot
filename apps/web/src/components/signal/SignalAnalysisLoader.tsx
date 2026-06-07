import { motion } from 'framer-motion';

interface Props {
  steps: string[];
  activeStep: number;
  title: string;
}

const RING_COUNT = 3;

export function SignalAnalysisLoader({ steps, activeStep, title }: Props) {
  return (
    <div className="py-6 text-center">
      <div className="relative mx-auto mb-7 h-36 w-full max-w-[300px] overflow-hidden rounded-3xl border border-prime-gold/25 bg-gradient-to-b from-black/80 via-prime-surface/90 to-black/90 shadow-[0_0_40px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(245,215,110,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.14),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 grid-bg" />

        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-prime-gold/20"
            style={{ width: 56 + i * 28, height: 56 + i * 28, marginLeft: -(28 + i * 14), marginTop: -(28 + i * 14) }}
            animate={{ scale: [0.92, 1.06, 0.92], opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: 2.8 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
          />
        ))}

        <motion.div
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-prime-gold/40 bg-gradient-to-br from-prime-gold/25 to-transparent shadow-[0_0_24px_rgba(212,175,55,0.25)]"
          animate={{ boxShadow: ['0 0 16px rgba(212,175,55,0.2)', '0 0 32px rgba(245,215,110,0.35)', '0 0 16px rgba(212,175,55,0.2)'] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <motion.div
            className="absolute inset-[3px] rounded-full border border-prime-gold-light/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[10px] font-bold tracking-[0.2em] text-prime-gold-light">AI</span>
          </div>
        </motion.div>

        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute h-1 w-1 rounded-full bg-prime-gold/70"
            style={{ left: `${18 + i * 16}%`, top: `${22 + (i % 3) * 18}%` }}
            animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -6, 0] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}

        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-prime-gold/60 to-transparent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <p className="absolute bottom-2 left-0 right-0 text-center font-display text-[9px] font-semibold tracking-[0.35em] text-prime-gold/70">
          PRIME SCAN
        </p>
      </div>

      <motion.p
        key={title}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 font-serif text-base font-medium tracking-wide text-prime-gold-light"
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
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
              i <= activeStep
                ? 'border border-prime-gold/30 bg-gradient-to-r from-prime-gold/[0.12] to-transparent text-prime-gold-light'
                : 'border border-transparent text-slate-600'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                i < activeStep
                  ? 'bg-prime-gold/20 text-prime-gold'
                  : i === activeStep
                    ? 'border border-prime-gold/50 text-prime-gold-light'
                    : 'border border-white/10 text-slate-600'
              }`}
            >
              {i < activeStep ? '✓' : i === activeStep ? '◆' : '○'}
            </span>
            <span>{step}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
