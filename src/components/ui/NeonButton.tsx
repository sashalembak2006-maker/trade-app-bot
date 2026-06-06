import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'yellow' | 'purple' | 'green' | 'blue' | 'outline';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const variants = {
  yellow: 'bg-gradient-to-r from-neon-yellow/90 to-yellow-500/80 text-black shadow-[0_0_20px_rgba(245,230,66,0.4)]',
  purple: 'bg-gradient-to-r from-neon-purple to-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]',
  green: 'bg-gradient-to-r from-neon-green to-emerald-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]',
  blue: 'bg-gradient-to-r from-neon-blue to-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]',
  outline: 'border border-white/20 bg-white/5 text-white hover:bg-white/10',
};

export function NeonButton({
  children,
  onClick,
  variant = 'purple',
  className = '',
  fullWidth = false,
  disabled = false,
}: NeonButtonProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      animate={
        !disabled && variant !== 'outline'
          ? { boxShadow: ['0 0 15px rgba(168,85,247,0.3)', '0 0 25px rgba(168,85,247,0.5)', '0 0 15px rgba(168,85,247,0.3)'] }
          : undefined
      }
      transition={{ duration: 2, repeat: Infinity }}
      className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
}
