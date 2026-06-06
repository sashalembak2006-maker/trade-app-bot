import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { generateAnalysis } from '../../services/analysis';
import { ASSETS } from '../../services/assets';
import { useCountdown } from '../../hooks/useCountdown';
import { CandlestickChart } from '../charts/CandlestickChart';
import { SentimentGauge } from '../charts/SentimentGauge';
import type { MarketAnalysis } from '../../types';

export function MarketAnalysisSection() {
  const [selectedAsset, setSelectedAsset] = useState('BTC/USD');
  const [analysis, setAnalysis] = useState<MarketAnalysis>(() => generateAnalysis('BTC/USD'));
  const { formatted } = useCountdown(analysis.expiryMinutes * 60);

  useEffect(() => {
    setAnalysis(generateAnalysis(selectedAsset));
  }, [selectedAsset]);

  const signalConfig = {
    bullish: { label: 'БИЧАЧИЙ', color: 'text-neon-green', bg: 'from-neon-green/20 to-transparent', icon: '📈' },
    bearish: { label: 'ВЕДМЕЖИЙ', color: 'text-red-400', bg: 'from-red-500/20 to-transparent', icon: '📉' },
    neutral: { label: 'НЕЙТРАЛЬНИЙ', color: 'text-neon-yellow', bg: 'from-neon-yellow/20 to-transparent', icon: '➡️' },
  };

  const trendLabels = { up: 'Вгору ↑', down: 'Вниз ↓', sideways: 'Боковик ↔' };
  const sig = signalConfig[analysis.signal];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ASSETS.slice(0, 6).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedAsset(a.symbol)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedAsset === a.symbol
                ? 'bg-neon-purple/30 text-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {a.symbol}
          </button>
        ))}
      </div>

      <motion.div
        key={analysis.signal}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl bg-gradient-to-br ${sig.bg} border border-white/10 p-5`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Сигнал AI</span>
            <div className={`text-2xl font-bold ${sig.color}`}>
              {sig.icon} {sig.label}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Впевненість</span>
            <motion.div
              className="text-3xl font-bold text-white"
              key={analysis.confidence}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              {analysis.confidence}%
            </motion.div>
          </div>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full ${analysis.signal === 'bullish' ? 'bg-neon-green' : analysis.signal === 'bearish' ? 'bg-red-500' : 'bg-neon-yellow'}`}
            initial={{ width: 0 }}
            animate={{ width: `${analysis.confidence}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-black/30 p-3">
            <span className="text-[10px] text-slate-500">Тренд</span>
            <p className="font-semibold text-white">{trendLabels[analysis.trend]}</p>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <span className="text-[10px] text-slate-500">RSI</span>
            <p className="font-semibold text-neon-purple">{analysis.rsi}</p>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <span className="text-[10px] text-slate-500">Підтримка</span>
            <p className="font-semibold text-neon-green">{analysis.support}</p>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <span className="text-[10px] text-slate-500">Опір</span>
            <p className="font-semibold text-red-400">{analysis.resistance}</p>
          </div>
        </div>
      </motion.div>

      <div className="rounded-xl border border-white/5 bg-white/5 p-4">
        <CandlestickChart height={100} />
      </div>

      <div className="flex items-center justify-around rounded-xl border border-white/5 bg-white/5 p-4">
        <SentimentGauge value={analysis.sentiment} />
        <div className="text-center">
          <span className="text-xs text-slate-400">Таймер сигналу</span>
          <motion.div
            className="font-display text-3xl font-bold text-neon-blue text-glow-blue"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {formatted}
          </motion.div>
        </div>
      </div>

      <motion.div
        className="neon-border-blue rounded-xl bg-neon-blue/10 p-4"
        whileHover={{ scale: 1.01 }}
      >
        <span className="text-xs text-slate-400">Рекомендація входу</span>
        <p className="mt-1 font-semibold text-white">{analysis.entrySuggestion}</p>
        <p className="mt-2 text-xs text-slate-500">
          MACD: {analysis.macd} · Експірація: {analysis.expiryMinutes} хв
        </p>
      </motion.div>
    </div>
  );
}
