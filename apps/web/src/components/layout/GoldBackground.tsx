import { motion } from 'framer-motion';

const DOLLAR_SIGNS = Array.from({ length: 24 }, (_, i) => ({
  x: `${(i * 17 + 5) % 95}%`,
  y: `${(i * 23 + 10) % 90}%`,
  size: 10 + (i % 4) * 4,
  delay: i * 0.3,
}));

export function GoldBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#050505] via-[#0a0906] to-[#050505]">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(212,175,55,0.06),transparent_40%)]" />

      {DOLLAR_SIGNS.map((d, i) => (
        <motion.span
          key={i}
          className="absolute font-bold text-prime-gold/20"
          style={{ left: d.x, top: d.y, fontSize: d.size }}
          animate={{ opacity: [0.08, 0.22, 0.08], y: [0, -8, 0] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: d.delay }}
        >
          $
        </motion.span>
      ))}

      <motion.div
        className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-prime-gold/5 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </div>
  );
}
