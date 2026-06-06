import { motion } from 'framer-motion';

const GLOW_ORBS = [
  { x: '15%', y: '20%', size: 280, delay: 0 },
  { x: '85%', y: '70%', size: 220, delay: 1.2 },
  { x: '50%', y: '90%', size: 180, delay: 0.6 },
];

export function GoldBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030304]">
      {/* Deep gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#08080c] via-[#050508] to-[#020203]" />

      {/* Subtle trading grid */}
      <div className="absolute inset-0 grid-bg opacity-[0.35]" />

      {/* Soft gold ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(212,175,55,0.14),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(168,85,247,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_0%_80%,rgba(34,197,94,0.04),transparent_45%)]" />

      {/* Faint chart silhouette */}
      <svg
        className="absolute bottom-0 left-0 right-0 h-[38%] w-full opacity-[0.06]"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          fill="none"
          stroke="#d4af37"
          strokeWidth="1.5"
          points="0,90 40,75 80,82 120,55 160,60 200,35 240,42 280,25 320,30 360,15 400,20"
        />
        <polyline
          fill="none"
          stroke="#22c55e"
          strokeWidth="1"
          points="0,100 50,95 100,88 150,92 200,78 250,85 300,70 350,75 400,65"
        />
      </svg>

      {GLOW_ORBS.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-prime-gold/8 blur-3xl"
          style={{
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
          transition={{ duration: 7 + i, repeat: Infinity, delay: o.delay }}
        />
      ))}

      {/* Top vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
    </div>
  );
}
