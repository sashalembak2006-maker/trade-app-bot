import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { hapticSelection } from '../../services/telegram';
import { SectionIcon, type SectionIconId } from './SectionIcon';

interface Props {
  id: SectionIconId;
  title: string;
  children: ReactNode;
  accent?: string;
}

export function ExpandableSection({ id, title, children, accent = 'border-prime-gold/20' }: Props) {
  const { openSection, toggleSection } = useAppStore();
  const isOpen = openSection === id;

  return (
    <motion.div
      layout
      className={`glass overflow-hidden rounded-[22px] border bg-gradient-to-br from-white/[0.05] via-transparent to-prime-gold/[0.03] ${accent}`}
    >
      <button
        type="button"
        onClick={() => { hapticSelection(); toggleSection(id); }}
        className="flex w-full items-center justify-between px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <SectionIcon id={id} />
          <span className="font-display text-sm font-bold tracking-[0.12em] text-white">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-prime-gold/20 bg-prime-gold/[0.06] text-[10px] text-prime-gold"
        >
          ▼
        </motion.span>
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
            <div className="border-t border-prime-gold/10 px-4 pb-4 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
