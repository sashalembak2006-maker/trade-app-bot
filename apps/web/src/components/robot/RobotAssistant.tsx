import { motion } from 'framer-motion';

export function RobotAssistant({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'h-20 w-20' : 'h-36 w-36';

  return (
    <motion.div
      className={`relative ${size}`}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-neon-purple/15 blur-xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className={`relative mx-auto ${compact ? 'h-16 w-14' : 'h-28 w-24'} rounded-2xl border-2 border-neon-purple/40 bg-gradient-to-b from-slate-800 to-slate-900 shadow-[0_0_25px_rgba(168,85,247,0.25)]`}>
        <div className={`flex items-center justify-center gap-3 ${compact ? 'pt-5' : 'pt-8'}`}>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} rounded-full bg-neon-blue`}
              animate={{ boxShadow: ['0 0 6px #3b82f6', '0 0 14px #3b82f6', '0 0 6px #3b82f6'] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <motion.div
          className={`mx-auto mt-2 rounded-full bg-neon-green/50 ${compact ? 'h-0.5 w-6' : 'h-1 w-10'}`}
          animate={{ width: compact ? ['1.5rem', '2rem', '1.5rem'] : ['2.5rem', '3rem', '2.5rem'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}
