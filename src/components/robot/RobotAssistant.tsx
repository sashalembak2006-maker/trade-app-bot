import { motion } from 'framer-motion';

export function RobotAssistant() {
  return (
    <motion.div
      className="relative mx-auto flex h-44 w-44 items-center justify-center"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-neon-purple/20 blur-2xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative">
        <motion.div
          className="relative h-32 w-28 rounded-2xl border-2 border-neon-purple/50 bg-gradient-to-b from-slate-800 to-slate-900 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
          whileHover={{ scale: 1.05 }}
        >
          <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-3">
            <motion.div
              className="h-2 w-6 rounded-full bg-neon-purple/80"
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="h-2 w-6 rounded-full bg-neon-purple/80"
              animate={{ rotate: [5, -5, 5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 pt-10">
            <motion.div
              className="relative h-5 w-5 rounded-full bg-neon-blue"
              animate={{
                boxShadow: [
                  '0 0 8px #3b82f6, 0 0 16px #3b82f6',
                  '0 0 16px #3b82f6, 0 0 32px #3b82f6',
                  '0 0 8px #3b82f6, 0 0 16px #3b82f6',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80" />
            </motion.div>
            <motion.div
              className="relative h-5 w-5 rounded-full bg-neon-blue"
              animate={{
                boxShadow: [
                  '0 0 8px #3b82f6, 0 0 16px #3b82f6',
                  '0 0 16px #3b82f6, 0 0 32px #3b82f6',
                  '0 0 8px #3b82f6, 0 0 16px #3b82f6',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
            >
              <div className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80" />
            </motion.div>
          </div>

          <motion.div
            className="mx-auto mt-4 h-1 w-12 rounded-full bg-neon-green/60"
            animate={{ width: ['2rem', '3rem', '2rem'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          <div className="absolute -bottom-1 left-2 right-2 h-1 rounded-full bg-neon-yellow/40" />
        </motion.div>

        <motion.div
          className="absolute -left-6 top-12 h-16 w-4 rounded-full border border-neon-blue/40 bg-slate-800"
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute -right-6 top-12 h-16 w-4 rounded-full border border-neon-blue/40 bg-slate-800"
          animate={{ rotate: [10, -10, 10] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-neon-green/30 bg-black/60 px-3 py-1 text-[10px] font-medium text-neon-green"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        AI Аналітик онлайн
      </motion.div>
    </motion.div>
  );
}
