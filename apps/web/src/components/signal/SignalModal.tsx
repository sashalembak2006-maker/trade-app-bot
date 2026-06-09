import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/translations';
import { api, type ApiError } from '../../services/api';
import { logger } from '../../services/logger';
import { hapticFeedback, hapticSuccess } from '../../services/telegram';
import { useTelegram } from '../../hooks/useTelegram';
import { useCountdown } from '../../hooks/useCountdown';
import {
  deriveRiskLevel,
  nextMartingaleMultiplier,
  overlayNumberFromMultiplier,
  settleSignal,
  timeframeToMs,
} from '../../utils/signal-settlement';
import { generateLocalSignal, recordSignalBackground, resolvePoEntryPrice } from '../../services/local-signal';
import { SignalAnalysisLoader } from './SignalAnalysisLoader';

const TIMEFRAMES = ['3s', '5s', '15s', '30s', '1m', '2m', '3m', '5m', '15m', '30m', '1h', '4h'];
const ANALYSIS_MIN_MS = 380;
const COVERAGE_ANALYSIS_MS = 320;
const LOADING_WATCHDOG_MS = 12_000;

/** Cancel stale in-flight signal requests when user retries. */
let activeSignalAbort: AbortController | null = null;

function abortActiveSignalRequest(): void {
  activeSignalAbort?.abort();
  activeSignalAbort = null;
}


function formatPrice(price: number) {
  return price.toLocaleString('uk-UA', { maximumFractionDigits: 5 });
}

function DirectionHero({ isCall, title, subtitle }: { isCall: boolean; title: string; subtitle: string }) {
  return (
    <div
      className={`relative mb-4 overflow-hidden rounded-2xl border p-6 text-center ${
        isCall
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/55 via-black/70 to-emerald-900/15'
          : 'border-rose-500/30 bg-gradient-to-br from-rose-950/55 via-black/70 to-rose-900/15'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_65%)]" />
      <motion.div
        className={`relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${
          isCall ? 'border-emerald-400/45 bg-emerald-500/10' : 'border-rose-400/45 bg-rose-500/10'
        }`}
        animate={{ boxShadow: isCall
          ? ['0 0 0 rgba(34,197,94,0)', '0 0 28px rgba(34,197,94,0.35)', '0 0 0 rgba(34,197,94,0)']
          : ['0 0 0 rgba(244,63,94,0)', '0 0 28px rgba(244,63,94,0.35)', '0 0 0 rgba(244,63,94,0)'] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-8 w-8 ${isCall ? 'text-emerald-300' : 'text-rose-300'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          {isCall ? (
            <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </motion.div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-prime-gold/65">
        PRIME TRADE
      </p>
      <h3 className={`font-display mt-2 text-2xl font-bold tracking-wide ${isCall ? 'text-emerald-200' : 'text-rose-200'}`}>
        {title}
      </h3>
      <p className="font-serif mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

function OutcomeBanner({
  variant,
  title,
  subtitle,
}: {
  variant: 'win' | 'loss' | 'draw';
  title: string;
  subtitle?: string;
}) {
  const styles = {
    win: {
      border: 'border-prime-gold/40',
      bg: 'bg-gradient-to-br from-prime-gold/15 via-black/50 to-emerald-950/25',
      iconBorder: 'border-prime-gold/50 bg-prime-gold/15',
      iconColor: 'text-prime-gold-light',
      titleColor: 'text-prime-gold-light text-glow-gold',
      glyph: (
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    loss: {
      border: 'border-rose-500/35',
      bg: 'bg-gradient-to-br from-rose-950/35 via-black/55 to-black/80',
      iconBorder: 'border-rose-400/40 bg-rose-500/10',
      iconColor: 'text-rose-300',
      titleColor: 'text-rose-200',
      glyph: (
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      ),
    },
    draw: {
      border: 'border-amber-500/35',
      bg: 'bg-gradient-to-br from-amber-950/30 via-black/55 to-black/80',
      iconBorder: 'border-amber-400/40 bg-amber-500/10',
      iconColor: 'text-amber-300',
      titleColor: 'text-amber-200',
      glyph: (
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      ),
    },
  }[variant];

  return (
    <div className={`relative mb-4 overflow-hidden rounded-2xl border p-6 text-center ${styles.border} ${styles.bg}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_70%)]" />
      <div className={`relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border ${styles.iconBorder} ${styles.iconColor}`}>
        {styles.glyph}
      </div>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-prime-gold/60">
        RESULT
      </p>
      <h3 className={`font-display mt-2 text-2xl font-bold tracking-wide ${styles.titleColor}`}>{title}</h3>
      {subtitle && <p className="font-serif mt-2 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-prime-gold/35 bg-prime-gold/10' : 'border-white/[0.06] bg-black/40'}`}>
      <p className={`text-[10px] uppercase tracking-wider ${accent ? 'text-prime-gold/70' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-semibold ${accent ? 'font-display text-prime-gold-light' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export function SignalModal() {
  const {
    selectedAsset, signalPhase, signalResult, settlement, martingaleMultiplier,
    selectedTimeframe, setSelectedAsset, setSignalPhase, setSignalResult, beginSignalResult,
    setSettlement, setMartingaleMultiplier, resetSignalSession,
    setLoadingStep, loadingStep, setSelectedTimeframe, language,
    signalError, setSignalError, marketStatus, setMarketStatus, setAssets,
    signalCurrentPrice, signalLockedEntryPrice, accessStatus, assets,
  } = useAppStore();
  const t = useT(language);
  useTelegram();
  const settledRef = useRef(false);
  const [loadingTitle, setLoadingTitle] = useState('');

  const liveAsset =
    selectedAsset &&
    (assets.find((a) => a.symbol === selectedAsset.symbol) ?? selectedAsset);

  useEffect(() => {
    return () => abortActiveSignalRequest();
  }, []);

  useEffect(() => {
    if (!selectedAsset) return;
    void api.requestFocus(selectedAsset.symbol, 90_000).catch(() => {});
    const id = setInterval(() => {
      void api.requestFocus(selectedAsset.symbol, 90_000).catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [selectedAsset?.symbol]);

  const { seconds, formatted } = useCountdown(
    signalPhase === 'result' ? signalResult?.expiresAt : null,
  );

  useEffect(() => {
    settledRef.current = false;
  }, [signalResult?.id]);

  // Live price during countdown — poll bridge every 400ms (WS alone can freeze).
  useEffect(() => {
    if (signalPhase !== 'result' || !signalResult) return;
    const sym = signalResult.symbol;
    let cancelled = false;

    const pollLive = async () => {
      try {
        const { price } = await api.getLivePrice(sym, 400);
        if (cancelled || price == null) return;
        useAppStore.setState({ signalCurrentPrice: price });
        const asset = useAppStore.getState().assets.find((a) => a.symbol === sym);
        if (asset) {
          useAppStore.getState().updateAssetPrice(sym, price, asset.payout, asset.change);
        }
      } catch {
        const a = useAppStore.getState().assets.find((x) => x.symbol === sym);
        const tick = a?.price ?? a?.lastKnownPrice;
        if (tick != null && !cancelled) {
          useAppStore.setState({ signalCurrentPrice: tick });
        }
      }
    };

    void api.requestFocus(sym, 45_000).catch(() => {});
    pollLive();
    const priceId = setInterval(pollLive, 250);
    const focusId = setInterval(() => void api.requestFocus(sym, 45_000).catch(() => {}), 4000);
    return () => {
      cancelled = true;
      clearInterval(priceId);
      clearInterval(focusId);
    };
  }, [signalPhase, signalResult?.symbol]);

  // Settle only after the full countdown — never on the first render (seconds was 0).
  useEffect(() => {
    if (signalPhase !== 'result' || !signalResult) return;
    if (settledRef.current) return;

    const expiryMs = new Date(signalResult.expiresAt).getTime();
    if (!Number.isFinite(expiryMs)) return;

    const finalize = (exitPrice: number | null) => {
      if (settledRef.current) return;
      settledRef.current = true;
      if (exitPrice == null) {
        setSettlement({
          outcome: 'undetermined',
          entryPrice: signalResult.entryPrice,
          exitPrice: null,
          direction: signalResult.direction,
          multiplier: martingaleMultiplier,
        });
        setSignalPhase('settled');
        hapticFeedback('heavy');
        return;
      }
      const result = settleSignal(
        signalResult.direction,
        signalResult.entryPrice,
        exitPrice,
        martingaleMultiplier,
      );
      setSettlement(result);
      setSignalPhase('settled');
      if (result.outcome === 'win') hapticSuccess();
      else hapticFeedback('heavy');
    };

    const trySettle = async () => {
      if (Date.now() < expiryMs) return;
      if (settledRef.current) return;

      let exitPrice: number | null =
        useAppStore.getState().signalCurrentPrice ?? signalResult.entryPrice;

      try {
        const livePrice = await Promise.race([
          api.getLivePrice(signalResult.symbol, 800).then((r) => r.price),
          new Promise<number | null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        if (livePrice != null && livePrice > 0) exitPrice = livePrice;
      } catch {
        const a = useAppStore.getState().assets.find((x) => x.symbol === signalResult.symbol);
        exitPrice = a?.price ?? a?.lastKnownPrice ?? exitPrice;
      }
      finalize(exitPrice);
    };

    void trySettle();
    const id = setInterval(() => void trySettle(), 250);
    return () => clearInterval(id);
  }, [signalPhase, signalResult, martingaleMultiplier, setSettlement, setSignalPhase]);

  useEffect(() => {
    if (signalPhase !== 'loading') return;
    const steps = t.loading;
    let step = 0;
    setLoadingStep(0);
    setLoadingTitle(t.analyzingMarket);
    const interval = setInterval(() => {
      if (step < steps.length) setLoadingTitle(steps[step] ?? t.analyzingMarket);
      step++;
      setLoadingStep(step);
      if (step >= steps.length) clearInterval(interval);
    }, 450);
    const watchdog = setTimeout(() => {
      if (useAppStore.getState().signalPhase !== 'loading') return;
      logger.error('Signal', 'loading watchdog fired');
      setSignalError(t.errorTimeout);
      setSignalPhase('idle');
      hapticFeedback('heavy');
    }, LOADING_WATCHDOG_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(watchdog);
    };
  }, [signalPhase, setLoadingStep, setSignalError, setSignalPhase, t.loading, t.analyzingMarket, t.errorTimeout]);

  const dataSourceBlocked =
    !!signalError &&
    signalError !== t.openAssetOnPlatform &&
    (/DATA SOURCE|market data unavailable|джерело ринкових|тимчасово недоступн|temporarily unavailable/i.test(signalError) ||
      marketStatus?.configured === false);

  const handleEnableDemoMode = async () => {
    hapticFeedback('medium');
    try {
      const status = await api.setMarketMode('mock');
      setMarketStatus(status);
      setSignalError(null);
      try {
        const data = await api.getAssets();
        setAssets(data.assets);
      } catch { /* assets reload is best-effort */ }
    } catch (e) {
      logger.error('Signal', 'enable demo mode failed', (e as ApiError).message);
      setSignalError(t.demoModeUnavailable);
    }
  };

  const handleRetry = () => {
    abortActiveSignalRequest();
    setSignalError(null);
    void handleGetSignal();
  };

  const runAnalysisAnimation = (minMs = ANALYSIS_MIN_MS) =>
    new Promise<void>((resolve) => {
      setSignalPhase('loading');
      setLoadingStep(0);
      setLoadingTitle(t.analyzingMarket);
      setTimeout(resolve, minMs);
    });

  const handleGetSignal = async (opts?: { keepMultiplier?: boolean }) => {
    if (!selectedAsset) return;

    if (!accessStatus?.hasAppAccess) {
      setSignalError(t.noSignalAccess);
      return;
    }

    if (marketStatus && !marketStatus.configured) {
      setSignalError(marketStatus.mode === 'live' ? t.dataTemporarilyUnavailable : t.dataSourceNotConnected);
      return;
    }

    hapticFeedback('medium');
    abortActiveSignalRequest();
    const abort = new AbortController();
    activeSignalAbort = abort;

    setSignalError(null);
    setSignalResult(null);
    setSettlement(null);
    if (!opts?.keepMultiplier) setMartingaleMultiplier(1);
    settledRef.current = false;
    useAppStore.setState({ signalCurrentPrice: null, signalLockedEntryPrice: null });
    setSignalPhase('loading');
    setLoadingStep(0);
    setLoadingTitle(t.analyzingMarket);
    logger.info('Signal', 'local generate', selectedAsset.symbol, selectedTimeframe);

    void api.requestFocus(selectedAsset.symbol, 90_000).catch(() => {});

    try {
      const [entryPrice] = await Promise.all([
        resolvePoEntryPrice(selectedAsset.symbol, selectedAsset),
        runAnalysisAnimation(),
      ]);
      if (abort.signal.aborted) return;

      if (entryPrice == null || entryPrice <= 0) {
        setSignalError(t.openAssetOnPlatform);
        setSignalPhase('idle');
        hapticFeedback('heavy');
        return;
      }

      const result = generateLocalSignal({
        asset: selectedAsset,
        timeframe: selectedTimeframe,
        entryPrice,
      });
      const durationMs = timeframeToMs(selectedTimeframe);
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      void api.requestFocus(selectedAsset.symbol, durationMs + 20_000).catch(() => {});
      beginSignalResult({ ...result, expiresAt });
      recordSignalBackground({ ...result, expiresAt });
      hapticSuccess();
      logger.info('Signal', 'received', result.direction, `${result.confidence}%`, entryPrice);
    } catch (e) {
      if (abort.signal.aborted) return;
      logger.error('Signal', 'local generation failed', e);
      setSignalError(t.errorSignal);
      setSignalPhase('idle');
      hapticFeedback('heavy');
    } finally {
      if (activeSignalAbort === abort) activeSignalAbort = null;
    }
  };

  const handleMartingaleRetry = async () => {
    if (!signalResult || !selectedAsset) return;
    const next = nextMartingaleMultiplier(martingaleMultiplier);
    if (!next) return;

    hapticFeedback('medium');
    abortActiveSignalRequest();
    setMartingaleMultiplier(next);
    setSignalPhase('loading');
    setSignalError(null);
    setSettlement(null);
    settledRef.current = false;
    useAppStore.setState({ signalCurrentPrice: null });

    try {
      void api.requestFocus(selectedAsset.symbol, 60_000).catch(() => {});
      const [entryPrice] = await Promise.all([
        resolvePoEntryPrice(selectedAsset.symbol, selectedAsset),
        runAnalysisAnimation(COVERAGE_ANALYSIS_MS),
      ]);

      if (entryPrice == null || entryPrice <= 0) {
        setSignalError(t.openAssetOnPlatform);
        setSignalPhase('settled');
        return;
      }

      const durationMs = timeframeToMs(selectedTimeframe);
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      const nextResult = {
        ...signalResult,
        id: `sig_${Date.now()}_cov${overlayNumberFromMultiplier(next)}`,
        entryPrice,
        expiresAt,
        createdAt: new Date().toISOString(),
      };
      beginSignalResult(nextResult);
      recordSignalBackground(nextResult);
      void api.requestFocus(selectedAsset.symbol, durationMs + 20_000).catch(() => {});
      hapticSuccess();
      logger.info('Signal', 'coverage retry', signalResult.direction, `×${next}`, entryPrice);
    } catch (e) {
      const err = e as ApiError;
      logger.error('Signal', 'coverage failed', err.code, err.message);
      setSignalError(t.errorSignal);
      setSignalPhase('settled');
    }
  };

  if (!selectedAsset || !liveAsset) return null;

  const isCall = signalResult?.direction === 'CALL';
  const nextMultiplier = nextMartingaleMultiplier(martingaleMultiplier);
  const overlayNum = overlayNumberFromMultiplier(martingaleMultiplier);
  const overlayLabel =
    overlayNum === 1 ? t.coverageOverlay1 : overlayNum === 2 ? t.coverageOverlay2 : null;
  const riskLevel = signalResult
    ? deriveRiskLevel(signalResult.confidence, signalResult.payout)
    : null;
  const riskLabel =
    riskLevel === 'low' ? t.riskLow : riskLevel === 'medium' ? t.riskMedium : t.riskHigh;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm"
        onClick={() => { if (signalPhase === 'idle') setSelectedAsset(null); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-strong max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-white/10 p-5 pb-8 shadow-[0_-10px_60px_rgba(168,85,247,0.2)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{liveAsset.flags[0]}</span>
              {liveAsset.flags[1] && <span className="text-2xl">{liveAsset.flags[1]}</span>}
              <div>
                <h3 className="font-bold text-white">{liveAsset.symbol}</h3>
                <p className="text-xs text-slate-400">{liveAsset.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{t.payout}</p>
              <motion.p
                key={liveAsset.payout}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-xl font-bold text-neon-yellow"
              >
                {liveAsset.payout > 0 ? `${liveAsset.payout}%` : '—'}
              </motion.p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedAsset(null); resetSignalSession(); }}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
            >
              ✕
            </button>
          </div>

          {liveAsset.payout < 60 && signalPhase === 'idle' && (
            <div className="mb-3 rounded-xl border border-neon-yellow/30 bg-neon-yellow/10 px-3 py-2 text-xs text-neon-yellow">
              ⚠️ {t.lowPayout}
            </div>
          )}

          {overlayLabel && (signalPhase === 'result' || signalPhase === 'settled') && (
            <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-300">
              {overlayLabel} · <span className="font-bold">×{martingaleMultiplier}</span>
            </div>
          )}

          {signalPhase === 'idle' && signalError && (
            <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="mt-2 text-sm font-bold text-red-300">{signalError}</p>
              <p className="mt-1 text-xs text-slate-400">{t.errorRetryHint}</p>
              <div className="mt-4 flex flex-col gap-2">
                {dataSourceBlocked && marketStatus?.activeMode !== 'mock' && (
                  <button
                    type="button"
                    onClick={handleEnableDemoMode}
                    className="btn-gold w-full rounded-xl py-3 text-sm font-bold"
                  >
                    {t.enableDemoMode}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5"
                >
                  {t.tryAgain}
                </button>
              </div>
            </div>
          )}

          {signalPhase === 'idle' && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-prime-gold/80">{t.expiration}</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {TIMEFRAMES.map((tf) => {
                  const active = selectedTimeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`min-w-[2.75rem] rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? 'border-prime-gold bg-prime-gold/20 text-prime-gold-light shadow-[0_0_16px_rgba(212,175,55,0.45)] ring-1 ring-prime-gold/60'
                          : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-prime-gold/35 hover:text-slate-200'
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleGetSignal()}
                className="btn-gold w-full rounded-2xl py-4 text-center text-sm"
              >
                {t.getSignal}
              </motion.button>
            </>
          )}

          {signalPhase === 'loading' && (
            <>
              {signalError ? (
                <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center">
                  <span className="text-3xl">⚠️</span>
                  <p className="mt-2 text-sm font-bold text-red-300">{signalError}</p>
                  <p className="mt-1 text-xs text-slate-400">{t.errorRetryHint}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    {t.tryAgain}
                  </button>
                </div>
              ) : (
                <>
                  <SignalAnalysisLoader
                    steps={[...t.loading]}
                    activeStep={Math.min(loadingStep, t.loading.length - 1)}
                    title={loadingTitle || t.analyzingMarket}
                  />
                  <p className="mt-2 text-center text-[11px] text-prime-gold/80">{t.fetchingLivePrice}</p>
                </>
              )}
            </>
          )}

          {signalPhase === 'result' && signalResult && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <DirectionHero
                isCall={isCall}
                title={isCall ? `${t.buy} · ${t.up}` : `${t.sell} · ${t.down}`}
                subtitle={signalResult.direction}
              />

              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <StatCard label={t.market} value={signalResult.market} />
                <StatCard label={t.time} value={signalResult.timeframe} accent />
                <StatCard
                  label={t.riskLevel}
                  value={riskLabel}
                />
                <StatCard label={t.confidence} value={`${signalResult.confidence}%`} />
                <StatCard label="RSI" value={String(signalResult.indicators.rsi)} />
                <StatCard label={t.payout} value={`${signalResult.payout}%`} />
              </div>

              <div className="mb-4 rounded-2xl border border-prime-gold/25 bg-black/50 p-5 text-center">
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-prime-gold/60">
                  {t.countdown}
                </p>
                <motion.p
                  className={`font-display mt-2 text-4xl font-bold tracking-wider ${
                    seconds <= 5 ? 'text-rose-300' : 'text-prime-gold-light text-glow-gold'
                  }`}
                  animate={seconds <= 5 ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
                  transition={{ duration: 0.85, repeat: seconds <= 5 ? Infinity : 0 }}
                >
                  {formatted}
                </motion.p>
                <div className="mx-auto mt-3 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-prime-gold/80 to-prime-gold-light"
                    animate={{ scaleX: [1, 0.15, 1] }}
                    transition={{ duration: Math.max(seconds, 1), ease: 'linear', repeat: Infinity }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{t.currentPrice}</p>
                <motion.p
                  key={signalCurrentPrice ?? signalResult.entryPrice}
                  initial={{ opacity: 0.85, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display mt-1 text-2xl font-bold tracking-wide text-prime-gold-light"
                >
                  {formatPrice(signalCurrentPrice ?? signalResult.entryPrice)}
                </motion.p>
                <p className="font-serif mt-2 text-xs text-slate-500">
                  {t.entry}: {formatPrice(signalLockedEntryPrice ?? signalResult.entryPrice)} · {t.liveFromPo}
                </p>
              </div>

              <p className="text-center text-[10px] text-slate-600">{t.disclaimer}</p>
            </motion.div>
          )}

          {signalPhase === 'settled' && signalResult && settlement && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              {settlement.outcome === 'win' ? (
                <OutcomeBanner
                  variant="win"
                  title={t.tradeWon}
                  subtitle={overlayLabel ? `${overlayLabel} — ${t.successCoverage}` : undefined}
                />
              ) : settlement.outcome === 'undetermined' ? (
                <OutcomeBanner variant="draw" title={t.tradeDraw} subtitle={t.resultUndetermined} />
              ) : (
                <OutcomeBanner
                  variant="loss"
                  title={t.tradeLost}
                  subtitle={nextMultiplier ? t.martingaleHint : t.stopTradingAsset}
                />
              )}

              <div className="mb-4 space-y-0 rounded-2xl border border-white/[0.06] bg-black/45 p-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">{t.asset}</span>
                  <span className="font-display font-semibold tracking-wide text-white">{selectedAsset.symbol}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-slate-500">{t.direction}</span>
                  <span className={`font-display font-bold tracking-wide ${settlement.direction === 'CALL' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {settlement.direction === 'CALL' ? t.buy : t.sell}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-slate-500">{t.entry}</span>
                  <span className="font-semibold text-prime-gold-light">{formatPrice(settlement.entryPrice)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">{t.exitPrice}</span>
                  <span className="font-semibold text-prime-gold-light">
                    {settlement.exitPrice != null ? formatPrice(settlement.exitPrice) : '—'}
                  </span>
                </div>
              </div>

              {settlement.outcome === 'loss' && nextMultiplier && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void handleMartingaleRetry()}
                  className="btn-gold mb-3 w-full rounded-2xl py-4 text-sm font-bold"
                >
                  {t.getCoverage} — {nextMultiplier === 2 ? t.coverageOverlay1 : t.coverageOverlay2}
                </motion.button>
              )}

              {(settlement.outcome === 'win' || settlement.outcome === 'undetermined' || !nextMultiplier) && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { abortActiveSignalRequest(); resetSignalSession(); }}
                  className="w-full rounded-2xl border border-white/10 py-4 text-sm font-semibold text-white hover:bg-white/5"
                >
                  {t.newSignal}
                </motion.button>
              )}

              <p className="mt-4 text-center text-[10px] text-slate-600">{t.disclaimer}</p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
