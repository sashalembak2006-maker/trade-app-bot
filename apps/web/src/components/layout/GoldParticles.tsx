import { motion } from 'framer-motion';
import { useMemo } from 'react';

/** Subtle gold dust — very light, no colored blobs. */
export function GoldParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 0.8 + Math.random() * 1.8,
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 4,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-prime-gold-light"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: '0 0 4px rgba(245,215,110,0.35)',
          }}
          animate={{ opacity: [0.04, 0.18, 0.04], y: [0, -12, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
}
