import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

const BENEFITS = [
  'Більше торгових сигналів на день',
  'Розширений аналіз ринку',
  'Додаткові індикатори та таймфрейми',
  'Пріоритетний доступ до активів',
  'Premium market analysis dashboard',
];

export function VipModal() {
  const { showVipModal, setShowVipModal } = useAppStore();

  const handleRequest = async () => {
    try {
      await api.vipRequest();
    } catch { /* ignore */ }
    setShowVipModal(false);
  };

  return (
    <AnimatePresence>
      {showVipModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setShowVipModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong gold-border w-full max-w-sm rounded-3xl p-6 gold-glow"
          >
            <div className="text-center">
              <motion.span
                className="text-5xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                👑
              </motion.span>
              <h2 className="mt-3 font-display text-xl font-bold text-gold text-glow-gold">VIP ДОСТУП</h2>
              <p className="mt-2 text-xs text-slate-400">Розширена аналітика та пріоритетний доступ</p>
            </div>

            <ul className="mt-5 space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-prime-gold">◆</span> {b}
                </li>
              ))}
            </ul>

            <p className="disclaimer mt-4 text-center">
              Розширена аналітика не гарантує прибуток. Торгівля повʼязана з ризиком.
            </p>

            <button type="button" onClick={handleRequest} className="btn-gold mt-5 w-full rounded-2xl py-3.5 text-sm">
              Запросити VIP доступ
            </button>
            <button
              type="button"
              onClick={() => setShowVipModal(false)}
              className="mt-2 w-full py-2 text-xs text-slate-500"
            >
              Закрити
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
