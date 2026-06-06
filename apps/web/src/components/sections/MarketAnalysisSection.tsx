import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import { api } from '../../services/api';
import { CandlestickChart } from '../charts/CandlestickChart';
import type { MarketAnalysisData } from '../../types';

export function MarketAnalysisSection() {
  const { assets, language } = useAppStore();
  const t = useT(language);
  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? 'EUR/USD');
  const [analysis, setAnalysis] = useState<MarketAnalysisData | null>(null);

  const selectedAsset = assets.find((a) => a.symbol === symbol);

  useEffect(() => {
    if (assets.length > 0 && !assets.some((a) => a.symbol === symbol)) {
      setSymbol(assets[0].symbol);
    }
  }, [assets, symbol]);

  useEffect(() => {
    api.getAssetAnalysis(symbol).then(setAnalysis).catch(() => setAnalysis(null));
  }, [symbol]);

  const riskColors = { low: 'text-neon-green', medium: 'text-neon-yellow', high: 'text-red-400' };
  const riskLabel = (level: string) => {
    if (level === 'low') return t.riskLow;
    if (level === 'high') return t.riskHigh;
    return t.riskMedium;
  };
  const trendLabel = (tr: string) => {
    if (tr === 'up') return t.up;
    if (tr === 'down') return t.down;
    return t.sideways;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {assets.slice(0, 8).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSymbol(a.symbol)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-bold ${
              symbol === a.symbol ? 'bg-neon-purple/30 text-neon-purple' : 'bg-white/5 text-slate-500'
            }`}
          >
            {a.symbol}
          </button>
        ))}
      </div>

      {analysis && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="rounded-2xl border border-white/5 bg-black/40 p-2">
            <CandlestickChart
              height={90}
              symbol={symbol}
              basePrice={selectedAsset?.price ?? selectedAsset?.lastKnownPrice ?? 0}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: t.trend, value: trendLabel(analysis.trend), color: 'text-white' },
              { label: t.volatility, value: `${Math.round(analysis.volatilityScore)}%`, color: 'text-neon-purple' },
              { label: t.payout, value: `${Math.round(analysis.payoutScore)}%`, color: 'text-neon-yellow' },
              { label: t.confidence, value: `${Math.round(analysis.signalConfidence)}%`, color: 'text-neon-green' },
              { label: t.recommended, value: analysis.recommendedTimeframe, color: 'text-neon-blue' },
              { label: t.riskLevel, value: riskLabel(analysis.riskLevel), color: riskColors[analysis.riskLevel] },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[10px] text-slate-500">{item.label}</p>
                <p className={`font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
