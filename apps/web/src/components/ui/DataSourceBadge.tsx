import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';

type BadgeState = 'demo' | 'real' | 'hybrid' | 'stale' | 'none';

function resolveState(
  status: ReturnType<typeof useAppStore.getState>['marketStatus'],
): BadgeState {
  if (!status) return 'none';
  if (status.mode === 'mock') return 'demo';
  if (status.mode === 'unconfigured') return 'none';
  if (status.source?.includes('hybrid')) return 'hybrid';
  if (status.stale) return 'stale';
  if (status.configured) return 'real';
  return 'none';
}

export function DataSourceBadge() {
  const { marketStatus, language } = useAppStore();
  const t = useT(language);
  const state = resolveState(marketStatus);

  const map: Record<BadgeState, { label: string; className: string; dot: string }> = {
    demo: {
      label: t.demoData,
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      dot: 'bg-amber-400',
    },
    real: {
      label: t.realDataConnected,
      className: 'border-neon-green/40 bg-neon-green/10 text-neon-green',
      dot: 'bg-neon-green animate-pulse',
    },
    hybrid: {
      label: t.hybridData,
      className: 'border-neon-blue/40 bg-neon-blue/10 text-neon-blue',
      dot: 'bg-neon-blue animate-pulse',
    },
    stale: {
      label: t.dataSourceStale,
      className: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
      dot: 'bg-orange-400 animate-pulse',
    },
    none: {
      label: t.dataSourceNotConnectedBadge,
      className: 'border-red-500/40 bg-red-500/10 text-red-300',
      dot: 'bg-red-500',
    },
  };

  // Premium UI: hide technical data-source labels when market is connected.
  if (state === 'hybrid' || state === 'real' || state === 'stale' || state === 'demo') return null;

  const cfg = map[state];

  return (
    <div className={`mx-4 mt-3 flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-bold tracking-wide ${cfg.className}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </div>
  );
}
