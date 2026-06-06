import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import type { CalculatorResult } from '../../types';

export function CalculatorSection() {
  const { language } = useAppStore();
  const t = useT(language);
  const [deposit, setDeposit] = useState('1000');
  const [firstBetPercent, setFirstBetPercent] = useState('1');
  const [multiplier, setMultiplier] = useState('2');
  const [levels, setLevels] = useState('5');
  const [payoutPercent, setPayoutPercent] = useState('80');
  const [result, setResult] = useState<CalculatorResult | null>(null);

  const calculate = async () => {
    const res = await api.calculate({
      deposit: Number(deposit),
      firstBetPercent: Number(firstBetPercent),
      multiplier: Number(multiplier),
      levels: Number(levels),
      payoutPercent: Number(payoutPercent),
    });
    setResult(res);
  };

  const fields = [
    { label: t.deposit, value: deposit, set: setDeposit },
    { label: t.firstBet, value: firstBetPercent, set: setFirstBetPercent },
    { label: t.multiplier, value: multiplier, set: setMultiplier },
    { label: t.levels, value: levels, set: setLevels },
    { label: t.payoutCalc, value: payoutPercent, set: setPayoutPercent },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <label key={f.label} className="block">
          <span className="mb-1 block text-[10px] text-slate-500">{f.label}</span>
          <input
            type="number"
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-neon-yellow/40"
          />
        </label>
      ))}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={calculate}
        className="w-full rounded-2xl bg-gradient-to-r from-neon-yellow to-yellow-500 py-3 font-bold text-black"
      >
        Розрахувати
      </motion.button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-black/40 p-2">
              <p className="text-[10px] text-slate-500">{t.firstBet}</p>
              <p className="font-bold text-neon-yellow">${result.firstBet}</p>
            </div>
            <div className="rounded-xl bg-black/40 p-2">
              <p className="text-[10px] text-slate-500">{t.totalRisk}</p>
              <p className="font-bold text-red-400">${result.totalRisk}</p>
            </div>
            <div className="rounded-xl bg-black/40 p-2">
              <p className="text-[10px] text-slate-500">{t.riskDeposit}</p>
              <p className="font-bold text-neon-purple">{result.riskPercent}%</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="p-2">{t.step}</th>
                  <th className="p-2">{t.bet}</th>
                  <th className="p-2">{t.profit}</th>
                  <th className="p-2">{t.totalRisk}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.step} className="border-b border-white/5 text-white">
                    <td className="p-2 text-center">{row.step}</td>
                    <td className="p-2 text-center text-neon-yellow">${row.bet}</td>
                    <td className="p-2 text-center text-neon-green">${row.potentialProfit}</td>
                    <td className="p-2 text-center text-red-400">${row.totalRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
