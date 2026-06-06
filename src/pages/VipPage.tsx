import { motion } from 'framer-motion';
import { VIP_BENEFITS, VIP_PLANS, VIP_SIGNALS } from '../services/vip';
import { NeonButton } from '../components/ui/NeonButton';
import { hapticSuccess, hapticFeedback } from '../services/telegram';

export function VipPage() {
  const handlePurchase = () => {
    hapticSuccess();
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  const handleAccess = () => {
    hapticFeedback('medium');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="relative overflow-hidden rounded-2xl border border-neon-yellow/30 bg-gradient-to-br from-neon-yellow/15 to-neon-purple/10 p-6 text-center">
        <motion.div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-neon-yellow/10 blur-2xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.span
          className="text-5xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ⭐
        </motion.span>
        <h2 className="mt-2 font-display text-xl font-bold text-neon-yellow text-glow-yellow">
          VIP ДОСТУП
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Преміум сигнали та ексклюзивний аналіз ринку
        </p>
      </div>

      <section>
        <h3 className="mb-3 font-semibold text-white">Преміум сигнали</h3>
        <div className="space-y-2">
          {VIP_SIGNALS.map((signal, i) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative flex items-center justify-between rounded-xl border p-4 ${
                signal.locked
                  ? 'border-white/5 bg-white/5'
                  : 'border-neon-green/30 bg-neon-green/5'
              }`}
            >
              {signal.locked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                  <span className="text-2xl">🔒</span>
                </div>
              )}
              <div>
                <span className="font-bold text-white">{signal.asset}</span>
                <div className="mt-1 flex gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      signal.direction === 'CALL'
                        ? 'bg-neon-green/20 text-neon-green'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {signal.direction}
                  </span>
                  <span className="text-xs text-slate-400">⏱ {signal.expiry}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-neon-purple">{signal.confidence}%</div>
                <span className="text-[10px] text-slate-500">впевненість</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-white">Переваги VIP</h3>
        <div className="space-y-2">
          {VIP_BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-start gap-2 text-sm text-slate-300"
            >
              <span className="text-neon-green">✓</span>
              {benefit}
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-white">Тарифні плани</h3>
        <div className="space-y-3">
          {VIP_PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className={`relative rounded-2xl border p-5 ${
                plan.popular
                  ? 'border-neon-yellow/40 bg-gradient-to-br from-neon-yellow/10 to-transparent shadow-[0_0_25px_rgba(245,230,66,0.15)]'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-neon-yellow px-3 py-0.5 text-[10px] font-bold text-black">
                  ПОПУЛЯРНИЙ
                </span>
              )}
              <div className="mb-3 flex items-baseline justify-between">
                <h4 className="font-bold text-white">{plan.name}</h4>
                <div className="text-right">
                  <span className="text-xl font-bold text-neon-yellow">{plan.price}</span>
                  <span className="block text-[10px] text-slate-500">/ {plan.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-neon-purple">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="space-y-3 pb-2">
        <NeonButton variant="yellow" fullWidth onClick={handlePurchase}>
          💎 Купити VIP
        </NeonButton>
        <NeonButton variant="outline" fullWidth onClick={handleAccess}>
          🔑 Отримати доступ
        </NeonButton>
      </div>
    </motion.div>
  );
}
