import { motion } from 'framer-motion';

const items = [
  { emoji: '💵', x: '8%', delay: 0, duration: 6 },
  { emoji: '🪙', x: '85%', delay: 1, duration: 7 },
  { emoji: '💰', x: '72%', delay: 2, duration: 5.5 },
  { emoji: '💎', x: '20%', delay: 0.5, duration: 8 },
  { emoji: '🪙', x: '55%', delay: 1.5, duration: 6.5 },
  { emoji: '💵', x: '40%', delay: 3, duration: 7.5 },
];

export function FloatingMoney() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      {items.map((item, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl opacity-20"
          style={{ left: item.x, bottom: '-10%' }}
          animate={{
            y: [0, -900],
            rotate: [0, 360],
            opacity: [0, 0.25, 0.15, 0],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: 'linear',
          }}
        >
          {item.emoji}
        </motion.span>
      ))}
    </div>
  );
}
