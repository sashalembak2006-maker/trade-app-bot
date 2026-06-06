import { useCallback, useEffect, useState } from 'react';
import { adminApi, type CollectorStatus, type MarketDataRow, type MarketDataStatus } from '../services/api';

function formatTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('uk-UA');
}

export function MarketDataDebug() {
  const token = localStorage.getItem('admin_token') ?? '';
  const [rows, setRows] = useState<MarketDataRow[]>([]);
  const [status, setStatus] = useState<MarketDataStatus | null>(null);
  const [collector, setCollector] = useState<CollectorStatus | null>(null);
  const [stats, setStats] = useState({ total: 0, pricedCount: 0, staleCount: 0 });
  const [mode, setMode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setError('Немає сесії адміна. Увійдіть на /admin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getMarketData(token);
      setRows(data.rows);
      setStatus(data.status);
      setCollector(data.collector);
      setStats(data.stats);
      setMode(data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [load]);

  const clearBridge = async () => {
    if (!token) return;
    try {
      await adminApi.clearBridgeData(token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    }
  };

  const restartCollector = async () => {
    if (!token) return;
    try {
      await adminApi.restartCollector(token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    }
  };

  return (
    <div className="min-h-screen bg-prime-bg p-4 text-white sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-prime-gold">Market Data Debug</h1>
            <p className="text-sm text-slate-400">/admin/market-data</p>
          </div>
          <a href="/admin" className="text-xs text-slate-400 underline hover:text-white">← Назад до адмінки</a>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Mode" value={mode || '—'} />
          <Stat label="Source" value={status?.source ?? '—'} />
          <Stat label="Configured" value={status?.configured ? 'yes' : 'no'} accent={status?.configured ? 'text-neon-green' : 'text-red-400'} />
          <Stat label="Last update" value={formatTime(status?.lastUpdate ?? null)} />
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-black/40 p-4">
          <h2 className="mb-3 text-sm font-bold text-prime-gold">VPS Data Collector</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Online" value={collector?.online ? 'yes' : 'no'} accent={collector?.online ? 'text-neon-green' : 'text-red-400'} />
            <Stat label="WS connected" value={collector?.wsConnected ? 'yes' : 'no'} />
            <Stat label="Assets" value={String(collector?.assetCount ?? stats.total)} />
            <Stat label="With live price" value={String(stats.pricedCount)} />
            <Stat label="Stale" value={String(stats.staleCount)} accent={stats.staleCount > 0 ? 'text-orange-400' : 'text-slate-300'} />
            <Stat label="Active stream" value={collector?.activeSymbol ?? '—'} />
            <Stat label="Collector HB" value={formatTime(collector?.lastHeartbeat ?? null)} />
            <Stat label="Message" value={collector?.message ?? '—'} />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-prime-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? '…' : '↻ Refresh'}
          </button>
          <button
            type="button"
            onClick={restartCollector}
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
          >
            ↻ Restart collector
          </button>
          <button
            type="button"
            onClick={clearBridge}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
          >
            🗑 Clear bridge data
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Payout %</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3">Stale</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Немає даних. Запустіть VPS collector або Bridge extension.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.symbol} className="border-t border-white/5">
                  <td className="px-4 py-3 font-semibold">{r.symbol}</td>
                  <td className="px-4 py-3 text-neon-blue">
                    {r.price != null ? r.price : <span className="text-slate-500">недоступна</span>}
                  </td>
                  <td className="px-4 py-3 text-neon-yellow">{r.payout}%</td>
                  <td className="px-4 py-3 text-slate-400">{r.source}</td>
                  <td className="px-4 py-3 text-slate-400">{formatTime(r.lastUpdated)}</td>
                  <td className={`px-4 py-3 font-bold ${r.stale ? 'text-orange-400' : 'text-neon-green'}`}>
                    {r.stale ? 'true' : 'false'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'text-white' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`truncate text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}
