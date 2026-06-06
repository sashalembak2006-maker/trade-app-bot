import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface MiniChartProps {
  trend: 'up' | 'down' | 'sideways';
  color?: string;
}

export function MiniChart({ trend, color }: MiniChartProps) {
  const points = useMemo(() => {
    const pts: number[] = [];
    let v = 50;
    for (let i = 0; i < 20; i++) {
      const bias = trend === 'up' ? 0.6 : trend === 'down' ? 0.4 : 0.5;
      v += (Math.random() - (1 - bias)) * 6;
      v = Math.max(10, Math.min(90, v));
      pts.push(v);
    }
    return pts;
  }, [trend]);

  const path = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * 100;
      return `${i === 0 ? 'M' : 'L'}${x},${100 - y}`;
    })
    .join(' ');

  const strokeColor = color ?? (trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#a855f7');

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-20" preserveAspectRatio="none">
      <motion.path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
    </svg>
  );
}
