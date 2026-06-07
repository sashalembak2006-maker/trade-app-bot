import { useEffect, useState } from 'react';
import type { AccessStatus } from '../services/api';
import { AccessGate } from './AccessGate';
import { GoldBackground } from '../components/layout/GoldBackground';
import { GoldParticles } from '../components/layout/GoldParticles';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ExpandableSection } from '../components/ui/ExpandableSection';
import { ActivesSection } from '../components/sections/ActivesSection';
import { LearningSection } from '../components/sections/LearningSection';
import { CalculatorSection } from '../components/sections/CalculatorSection';
import { NewsSection } from '../components/sections/NewsSection';
import { IndicatorsSection } from '../components/sections/IndicatorsSection';
import { MarketAnalysisSection } from '../components/sections/MarketAnalysisSection';
import { SignalModal } from '../components/signal/SignalModal';
import { VipModal } from '../components/vip/VipModal';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/translations';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { getRuntimeApiUrl } from '../services/runtime-config';

interface MainAppProps {
  limited?: boolean;
  access?: AccessStatus | null;
  telegramId?: number;
  apiError?: string;
  onRefreshAccess?: () => Promise<unknown>;
}

export function MainApp({ limited = false, access, telegramId, apiError, onRefreshAccess }: MainAppProps) {
  const { language, setAssets, marketStatus, setMarketStatus, accessStatus } = useAppStore();
  const [showRegistration, setShowRegistration] = useState(false);
  const effectiveLimited = limited || !accessStatus?.hasAppAccess;
  const t = useT(language);
  useWebSocket();

  const enableDemoMode = async () => {
    try {
      const status = await api.setMarketMode('mock');
      setMarketStatus(status);
      const data = await api.getAssets();
      setAssets(data.assets);
      logger.info('Assets', `demo mode: ${data.assets.length} pairs`);
    } catch (e) {
      logger.error('Assets', 'demo mode failed', e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .getAssets()
      .then(({ assets, dataSource }) => {
        if (cancelled) return;
        setMarketStatus(dataSource);
        setAssets(assets);
        logger.info('Assets', `loaded ${assets.length} (${dataSource.mode})`);
      })
      .catch(async (e) => {
        logger.error('Assets', 'load failed', e);
        if (cancelled) return;
        try {
          const status = await api.getMarketStatus();
          if (cancelled) return;
          setMarketStatus(status);
          if (status.mode === 'live') {
            setAssets([]);
            return;
          }
        } catch { /* fall through */ }
        if (import.meta.env.DEV) {
          import('../services/fallback-assets').then((m) => {
            setMarketStatus({ mode: 'mock', configured: true, source: 'fallback' });
            setAssets(m.FALLBACK_ASSETS);
          });
        } else {
          setMarketStatus({ mode: 'unconfigured', configured: false, source: 'none' });
          setAssets([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setAssets, setMarketStatus]);

  // Poll market status + assets (REST fallback when WS or bridge hiccups).
  useEffect(() => {
    const reloadAssets = () => {
      api
        .getAssets()
        .then(({ assets, dataSource }) => {
          setMarketStatus(dataSource);
          setAssets(assets);
        })
        .catch(() => { /* keep last assets */ });
    };

    const id = setInterval(() => {
      api
        .getMarketStatus()
        .then((s) => {
          setMarketStatus(s);
          if (s.mode === 'live') reloadAssets();
        })
        .catch(() => { /* keep last status */ });
    }, 1000);
    return () => clearInterval(id);
  }, [setMarketStatus, setAssets]);

  const notConfigured = marketStatus && !marketStatus.configured && marketStatus.mode !== 'live';
  const platformUnavailable =
    marketStatus?.mode === 'live' &&
    !marketStatus.configured &&
    (marketStatus.assetCount ?? 0) === 0;
  const apiBase =
    getRuntimeApiUrl() || 'https://prime-trade-production.up.railway.app';
  const bridgeHint = `${t.bridgeNotConnectedHint}\n\nBackend URL:\n${apiBase}`;

  const bridgeStale =
    marketStatus?.mode === 'live' &&
    !marketStatus.configured &&
    (marketStatus.assetCount ?? 0) > 0;

  return (
    <div className="relative min-h-full bg-prime-bg">
      <GoldBackground />
      <GoldParticles />

      <div className="relative z-10 mx-auto min-h-full w-full max-w-[430px]">
        <Header />
        {effectiveLimited && (
          <div className="mx-4 mt-2 rounded-xl border border-prime-gold/30 bg-prime-gold/10 px-4 py-3 text-xs text-prime-gold">
            <p className="font-bold">🔒 Обмежений режим</p>
            <p className="mt-1 text-[11px] text-slate-300">
              {accessStatus?.status === 'pending_deposit'
                ? 'Очікує підтвердження депозиту адміністратором.'
                : accessStatus?.status === 'registered'
                  ? 'Поповніть депозит і натисніть «Я поповнив депозит» у боті.'
                  : 'Зареєструйтесь і підтвердіть депозит для доступу до сигналів.'}
            </p>
            {telegramId != null && onRefreshAccess && (
              <button
                type="button"
                onClick={() => setShowRegistration((v) => !v)}
                className="mt-2 w-full rounded-lg border border-prime-gold/40 py-2 text-[11px] font-semibold"
              >
                {showRegistration ? 'Закрити реєстрацію' : '📝 Реєстрація / статус'}
              </button>
            )}
          </div>
        )}
        {showRegistration && telegramId != null && onRefreshAccess && (
          <div className="mx-4 mt-2">
            <AccessGate
              access={access ?? accessStatus}
              telegramId={telegramId}
              apiError={apiError}
              onRefresh={onRefreshAccess}
              embedded
            />
          </div>
        )}
        <DataSourceBadge />
        {bridgeStale && (
          <div className="mx-4 mt-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200">
            <p className="text-center font-bold">⚠️ {t.bridgeStaleTitle}</p>
            <p className="mt-1 text-center text-[11px] leading-relaxed text-orange-100/90">{t.bridgeStaleHint}</p>
          </div>
        )}
        {(platformUnavailable || notConfigured) && (
          <div className="mx-4 mt-2 space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <p className="text-center font-bold">⏳ {t.bridgeNotConnectedTitle}</p>
            <p className="whitespace-pre-line text-center text-[11px] leading-relaxed text-amber-100/90">{bridgeHint}</p>
            <button
              type="button"
              onClick={() => void enableDemoMode()}
              className="btn-gold w-full rounded-xl py-3 text-center text-xs font-bold"
            >
              {t.enableDemoModeNow}
            </button>
          </div>
        )}
        <main className="space-y-3 px-4 py-4 pb-36">
          <ExpandableSection id="assets" icon="📈" title={t.assets} accent="border-prime-gold/20">
            <ActivesSection />
          </ExpandableSection>
          <ExpandableSection id="learning" icon="🎓" title={t.learning} accent="border-prime-gold/15">
            <LearningSection />
          </ExpandableSection>
          <ExpandableSection id="calculator" icon="🧮" title={t.calculator} accent="border-prime-gold/15">
            <CalculatorSection />
          </ExpandableSection>
          <ExpandableSection id="news" icon="📰" title={t.news} accent="border-prime-gold/15">
            <NewsSection />
          </ExpandableSection>
          <ExpandableSection id="indicators" icon="📉" title={t.indicators} accent="border-prime-gold/15">
            <IndicatorsSection />
          </ExpandableSection>
          <ExpandableSection id="analysis" icon="📊" title={t.analysis} accent="border-prime-gold/25">
            <MarketAnalysisSection />
          </ExpandableSection>
        </main>
        <Footer />
        <SignalModal />
        <VipModal />
        <p className="disclaimer fixed bottom-14 left-0 right-0 z-30 mx-auto max-w-[430px] px-6 text-center">
          Сигнали є аналітичним прогнозом і не є фінансовою порадою. Торгівля повʼязана з ризиком.
        </p>
      </div>
    </div>
  );
}
