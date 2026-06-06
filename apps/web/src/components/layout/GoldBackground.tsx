import { motion } from 'framer-motion';

/** Staggered $ watermark grid — matches TRADE APP BOT reference. */
const DOLLAR_SIGNS = Array.from({ length: 56 }, (_, i) => {
  const col = i % 7;
  const row = Math.floor(i / 7);
  return {
    x: `${4 + col * 14 + (row % 2) * 7}%`,
    y: `${2 + row * 12}%`,
    size: 10 + (i % 4) * 4,
    delay: (i % 8) * 0.28,
    baseOpacity: 0.06 + (i % 5) * 0.025,
  };
});

export function GoldBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050505]">
      {/* Base — deep charcoal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0906] via-[#050505] to-[#040404]" />

      {/* Gold trading grid */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Top gold ambient glow (reference screenshot) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(212,175,55,0.14),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_85%_75%,rgba(212,175,55,0.07),transparent_45%)]" />

      {/* Floating $ pattern */}
      {DOLLAR_SIGNS.map((d, i) => (
        <motion.span
          key={i}
          className="absolute select-none font-bold leading-none text-prime-gold"
          style={{
            left: d.x,
            top: d.y,
            fontSize: d.size,
            textShadow: '0 0 12px rgba(212,175,55,0.15)',
          }}
          animate={{
            opacity: [d.baseOpacity * 0.7, d.baseOpacity * 1.5, d.baseOpacity * 0.7],
            y: [0, -7, 0],
          }}
          transition={{ duration: 4.5 + (i % 3), repeat: Infinity, delay: d.delay }}
        >
          $
        </motion.span>
      ))}

      {/* Central soft bloom */}
      <motion.div
        className="absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full bg-prime-gold/[0.06] blur-3xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity }}
      />

      {/* Edge vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/50" />
    </div>
  );
}
