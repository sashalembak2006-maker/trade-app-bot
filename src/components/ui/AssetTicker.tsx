import { useAssetTicker } from '../../hooks/useAssetTicker';

export function AssetTicker() {
  const items = useAssetTicker();
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/30 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-cyber-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-cyber-bg to-transparent" />
      <div className="ticker-track flex w-max gap-6 px-4">
        {doubled.map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex shrink-0 items-center gap-2 text-xs">
            <span className="font-semibold text-white">{item.symbol}</span>
            <span className="text-slate-400">{item.price.toLocaleString('uk-UA')}</span>
            <span
              className={
                item.trend === 'up'
                  ? 'text-neon-green'
                  : item.trend === 'down'
                    ? 'text-red-400'
                    : 'text-slate-400'
              }
            >
              {item.change > 0 ? '+' : ''}
              {item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
