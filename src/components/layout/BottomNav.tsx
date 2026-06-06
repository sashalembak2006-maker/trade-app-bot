import { motion } from 'framer-motion';
import type { PageId } from '../../types';
import { hapticSelection } from '../../services/telegram';

interface BottomNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: { id: PageId; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Головна' },
  { id: 'vip', icon: '⭐', label: 'VIP' },
  { id: 'profile', icon: '👤', label: 'Профіль' },
];

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                hapticSelection();
                onNavigate(item.id);
              }}
              className="relative flex flex-col items-center gap-0.5 px-4 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 h-0.5 w-8 rounded-full bg-neon-purple"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`text-xl ${isActive ? 'scale-110' : 'opacity-60'}`}>{item.icon}</span>
              <span
                className={`text-[10px] font-medium ${isActive ? 'text-neon-purple' : 'text-slate-500'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
