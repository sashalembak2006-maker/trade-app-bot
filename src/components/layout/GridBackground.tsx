import { motion } from 'framer-motion';

export function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <motion.div
        className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-neon-purple/10 blur-3xl"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-neon-blue/10 blur-3xl"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute top-1/3 -left-16 h-40 w-40 rounded-full bg-neon-yellow/5 blur-3xl"
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  );
}
