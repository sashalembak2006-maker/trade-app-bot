import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { hapticSelection } from '../../services/telegram';

interface ExpandableSectionProps {
  icon: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: 'yellow' | 'purple' | 'green' | 'blue';
  delay?: number;
}

const accentColors = {
  yellow: 'from-neon-yellow/20 to-transparent border-neon-yellow/30',
  purple: 'from-neon-purple/20 to-transparent border-neon-purple/30',
  green: 'from-neon-green/20 to-transparent border-neon-green/30',
  blue: 'from-neon-blue/20 to-transparent border-neon-blue/30',
};

const accentGlow = {
  yellow: 'shadow-[0_0_15px_rgba(245,230,66,0.15)]',
  purple: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
  green: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
  blue: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
};

export function ExpandableSection({
  icon,
  title,
  children,
  defaultOpen = false,
  accent = 'purple',
  delay = 0,
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    hapticSelection();
    setIsOpen((prev) => !prev);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`glass overflow-hidden rounded-2xl border bg-gradient-to-br ${accentColors[accent]} ${accentGlow[accent]}`}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <span className="font-semibold text-white">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-neon-purple"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-4 pb-4 pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
