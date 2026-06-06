import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  neon?: 'yellow' | 'purple' | 'green' | 'blue' | 'none';
  onClick?: () => void;
  delay?: number;
}

const neonClasses = {
  yellow: 'neon-border-yellow',
  purple: 'neon-border-purple',
  green: 'neon-border-green',
  blue: 'neon-border-blue',
  none: '',
};

export function GlassCard({ children, className = '', neon = 'none', onClick, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`glass rounded-2xl p-4 ${neonClasses[neon]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
