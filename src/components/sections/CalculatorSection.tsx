import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export function CalculatorSection() {
  const [balance, setBalance] = useState('1000');
  const [riskPercent, setRiskPercent] = useState('2');
  const [tradeAmount, setTradeAmount] = useState('20');

  const recommended = useMemo(() => {
    const bal = parseFloat(balance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    return Math.round((bal * risk) / 100 * 100) / 100;
  }, [balance, riskPercent]);

  const riskOfTrade = useMemo(() => {
    const bal = parseFloat(balance) || 1;
    const amount = parseFloat(tradeAmount) || 0;
    return Math.round((amount / bal) * 10000) / 100;
  }, [balance, tradeAmount]);

  const isRisky = riskOfTrade > parseFloat(riskPercent);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Баланс ($)</span>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="glass w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Ризик (%)</span>
          <input
            type="number"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            className="glass w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-neon-purple/50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Сума угоди ($)</span>
          <input
            type="number"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(e.target.value)}
            className="glass w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-neon-green/50"
          />
        </label>
      </div>

      <motion.div
        key={recommended}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="neon-border-green rounded-xl bg-neon-green/10 p-4 text-center"
      >
        <p className="mb-1 text-xs text-slate-400">Рекомендований розмір угоди</p>
        <p className="text-3xl font-bold text-neon-green text-glow-green">${recommended}</p>
        <p className="mt-2 text-xs text-slate-500">
          Це {riskPercent}% від вашого балансу
        </p>
      </motion.div>

      {isRisky && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          ⚠️ Поточна сума угоди ({riskOfTrade}%) перевищує допустимий ризик ({riskPercent}%)
        </motion.div>
      )}
    </div>
  );
}
