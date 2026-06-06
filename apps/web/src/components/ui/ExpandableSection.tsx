import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { hapticSelection } from '../../services/telegram';

interface Props {
  id: string;
  icon: string;
  title: string;
  children: ReactNode;
  accent?: string;
}

export function ExpandableSection({ id, icon, title, children, accent = 'border-neon-purple/20' }: Props) {
  const { openSection, toggleSection } = useAppStore();
  const isOpen = openSection === id;

  return (
    <motion.div
      layout
      className={`glass overflow-hidden rounded-[22px] border bg-gradient-to-br from-white/[0.04] to-transparent ${accent}`}
    >
      <button
        type="button"
        onClick={() => { hapticSelection(); toggleSection(id); }}
        className="flex w-full items-center justify-between px-4 py-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-extrabold tracking-wide text-white">{title}</span>
        </div>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-neon-purple text-xs">▼</motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-4 pb-4 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
