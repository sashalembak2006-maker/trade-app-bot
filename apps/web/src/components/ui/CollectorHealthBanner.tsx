import { resolveCollectorConnectionState, shouldShowCollectorHealthBanner } from '@trade-app/shared';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';

export function CollectorHealthBanner() {
  const { marketStatus, language } = useAppStore();
  const t = useT(language);

  if (!marketStatus || marketStatus.mode === 'mock') return null;
  if (!shouldShowCollectorHealthBanner(marketStatus)) return null;

  const state = resolveCollectorConnectionState(marketStatus);
  const msg = marketStatus.collectorMessage ?? '';

  const text =
    state === 'AUTH_ERROR'
      ? t.collectorAuthExpired
      : state === 'RECONNECTING'
        ? t.collectorReconnecting
        : state === 'CONNECTING'
          ? t.collectorConnecting
          : t.collectorOffline;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-xs text-red-200">
      <p className="font-bold">{text}</p>
      {msg && state !== 'CONNECTED' && (
        <p className="mt-1 text-[10px] text-red-300/80">{msg}</p>
      )}
      {state === 'AUTH_ERROR' && (
        <p className="mt-2 text-[10px] text-slate-400">{t.collectorAuthHint}</p>
      )}
    </div>
  );
}
