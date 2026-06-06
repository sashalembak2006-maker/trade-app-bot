import { useAppStore } from '../../store/useAppStore';
import { formatPercentChange } from '../../utils/format';

export function AssetTicker() {
  const assets = useAppStore((s) => s.assets);
  const tickerAssets = assets.slice(0, 8);
  const doubled = [...tickerAssets, ...tickerAssets];

  if (tickerAssets.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-cyber-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-cyber-bg to-transparent" />
      <div className="ticker-track flex w-max gap-5 px-3">
        {doubled.map((a, i) => (
          <div key={`${a.symbol}-${i}`} className="flex shrink-0 items-center gap-1.5 text-[11px]">
            <span>{a.flags[0]}</span>
            {a.flags[1] && <span>{a.flags[1]}</span>}
            <span className="font-bold text-white">{a.symbol}</span>
            <span className="text-slate-400">{a.price != null ? a.price.toLocaleString('uk-UA', { maximumFractionDigits: 4 }) : '—'}</span>
            <span className="font-bold text-neon-yellow">{a.payout}%</span>
            <span className={a.change >= 0 ? 'text-neon-green' : 'text-red-400'}>
              {formatPercentChange(a.change)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
