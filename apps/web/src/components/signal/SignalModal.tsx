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
import { SignalAnalysisLoader } from './SignalAnalysisLoader';

const TIMEFRAMES = ['3s', '5s', '15s', '30s', '1m', '2m', '3m', '5m', '15m', '30m', '1h', '4h'];
const ANALYSIS_MIN_MS = 4000;

function formatPrice(price: number) {
  return price.toLocaleString('uk-UA', { maximumFractionDigits: 5 });
}

export function SignalModal() {
  const {
    selectedAsset, signalPhase, signalResult, settlement, martingaleMultiplier,
    selectedTimeframe, setSelectedAsset, setSignalPhase, setSignalResult, beginSignalResult,
    setSettlement, setMartingaleMultiplier, resetSignalSession,
    setLoadingStep, loadingStep, setSelectedTimeframe, language,
    signalError, setSignalError, marketStatus, setMarketStatus, setAssets,
    signalCurrentPrice, accessStatus, assets,
  } = useAppStore();
  const t = useT(language);
  useTelegram();
  const settledRef = useRef(false);
  const [loadingTitle, setLoadingTitle] = useState('');

  const liveAsset =
    selectedAsset &&
    (assets.find((a) => a.symbol === selectedAsset.symbol) ?? selectedAsset);

  useEffect(() => {
    if (!selectedAsset) return;
    void api.requestFocus(selectedAsset.symbol, 90_000).catch(() => {});
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
        const { price } = await api.getLivePrice(sym, 800);
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
    const priceId = setInterval(pollLive, 400);
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

      let exitPrice: number | null = null;
      try {
        const live = await api.getLivePrice(signalResult.symbol);
        exitPrice = live.price;
      } catch {
        const a = useAppStore.getState().assets.find((x) => x.symbol === signalResult.symbol);
        exitPrice = a?.price ?? a?.lastKnownPrice ?? useAppStore.getState().signalCurrentPrice;
      }
      finalize(exitPrice);
    };

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
    }, 800);
    return () => clearInterval(interval);
  }, [signalPhase, setLoadingStep, t.loading, t.analyzingMarket]);

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
    setSignalError(null);
    void handleGetSignal();
  };

  const runAnalysisAnimation = () =>
    new Promise<void>((resolve) => {
      setSignalPhase('loading');
      setLoadingStep(0);
      setLoadingTitle(t.analyzingMarket);
      setTimeout(resolve, ANALYSIS_MIN_MS);
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
    setSignalError(null);
    setSignalResult(null);
    setSettlement(null);
    if (!opts?.keepMultiplier) setMartingaleMultiplier(1);
    settledRef.current = false;
    useAppStore.setState({ signalCurrentPrice: null });
    logger.info('Signal', 'requesting', selectedAsset.symbol, selectedTimeframe);

    await runAnalysisAnimation();

    try {
      const result = await api.generateSignal({
        assetId: selectedAsset.id,
        symbol: selectedAsset.symbol,
        timeframe: selectedTimeframe,
        isOTC: selectedAsset.isOTC,
      });
      const durationMs = timeframeToMs(selectedTimeframe);
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      void api.requestFocus(selectedAsset.symbol, durationMs + 20_000).catch(() => {});
      beginSignalResult({ ...result, expiresAt });
      hapticSuccess();
      logger.info('Signal', 'received', result.direction, `${result.confidence}%`);
    } catch (e) {
      const err = e as ApiError;
      logger.error('Signal', 'generation failed', err.code, err.message);
      const msg =
        err.code === 'NO_PRICE' || err.status === 422
          ? t.openAssetOnPlatform
          : err.code === 'DATA_SOURCE_NOT_CONFIGURED' || err.status === 503
            ? (marketStatus?.mode === 'live' ? t.dataTemporarilyUnavailable : t.dataSourceNotConnected)
            : err.code === 'TIMEOUT'
              ? t.errorTimeout
              : err.code === 'NETWORK'
                ? t.errorNetwork
                : err.code === 'NO_ACCESS'
                  ? t.noSignalAccess
                  : err.message || t.errorSignal;
      setSignalError(msg);
      setSignalPhase('idle');
      hapticFeedback('heavy');
    }
  };

  const handleMartingaleRetry = async () => {
    if (!signalResult || !selectedAsset) return;
    const next = nextMartingaleMultiplier(martingaleMultiplier);
    if (!next) return;

    hapticFeedback('medium');
    setMartingaleMultiplier(next);
    setSettlement(null);
    settledRef.current = false;
    useAppStore.setState({ signalCurrentPrice: null });

    await runAnalysisAnimation();

    try {
      void api.requestFocus(selectedAsset.symbol, 45_000).catch(() => {});
      let entryPrice = signalResult.entryPrice;
      try {
        const live = await api.getLivePrice(selectedAsset.symbol, 2500);
        if (live.price != null) entryPrice = live.price;
      } catch {
        const tick = useAppStore.getState().signalCurrentPrice;
        if (tick != null) entryPrice = tick;
      }

      const durationMs = timeframeToMs(selectedTimeframe);
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      beginSignalResult({
        ...signalResult,
        id: `sig_${Date.now()}_cov${overlayNumberFromMultiplier(next)}`,
        entryPrice,
        expiresAt,
        createdAt: new Date().toISOString(),
      });
      void api.requestFocus(selectedAsset.symbol, durationMs + 20_000).catch(() => {});
      hapticSuccess();
      logger.info('Signal', 'coverage retry', signalResult.direction, `×${next}`);
    } catch (e) {
      logger.error('Signal', 'coverage failed', e);
      setSignalPhase('settled');
      setSignalError(t.errorSignal);
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
            <button
              type="button"
              onClick={() => { setSelectedAsset(null); resetSignalSession(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
            >
              ✕
            </button>
          </div>

          {(signalPhase === 'idle' || signalPhase === 'loading') && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-black/40 p-4">
              <div>
                <p className="text-xs text-slate-500">{t.entry}</p>
                <p className="text-2xl font-bold text-white">
                  {liveAsset.price != null
                    ? formatPrice(liveAsset.price)
                    : liveAsset.lastKnownPrice != null
                      ? formatPrice(liveAsset.lastKnownPrice)
                      : '—'}
                </p>
                {liveAsset.price == null && (
                  <p className="text-[10px] text-slate-500">{t.priceOnSignalStart}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{t.payout}</p>
                <motion.p
                  key={liveAsset.payout}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-bold text-neon-yellow"
                >
                  {liveAsset.payout}%
                </motion.p>
              </div>
            </div>
          )}

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
            <SignalAnalysisLoader
              steps={[...t.loading]}
              activeStep={Math.min(loadingStep, t.loading.length - 1)}
              title={loadingTitle || t.analyzingMarket}
            />
          )}

          {signalPhase === 'result' && signalResult && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div
                className={`mb-4 rounded-2xl p-6 text-center ${
                  isCall
                    ? 'border border-neon-green/40 bg-gradient-to-br from-neon-green/30 to-emerald-900/30'
                    : 'border border-red-500/40 bg-gradient-to-br from-red-500/30 to-red-900/30'
                }`}
              >
                <motion.span
                  className="text-6xl"
                  animate={{ y: isCall ? [-5, 5, -5] : [5, -5, 5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {isCall ? '⬆️' : '⬇️'}
                </motion.span>
                <h3 className={`mt-2 text-2xl font-bold ${isCall ? 'text-neon-green' : 'text-red-400'}`}>
                  {isCall ? `${t.buy} / ${t.up}` : `${t.sell} / ${t.down}`}
                </h3>
                <p className="mt-1 text-sm text-white/80">{signalResult.direction}</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/40 p-3">
                  <p className="text-[10px] text-slate-500">{t.market}</p>
                  <p className="font-semibold text-white">{signalResult.market}</p>
                </div>
                <div className="rounded-xl border border-prime-gold/40 bg-prime-gold/15 p-3">
                  <p className="text-[10px] text-prime-gold/70">{t.time}</p>
                  <p className="font-bold text-prime-gold-light text-glow-gold">{signalResult.timeframe}</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3">
                  <p className="text-[10px] text-slate-500">{t.entry}</p>
                  <p className="font-semibold text-neon-blue">{formatPrice(signalResult.entryPrice)}</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3">
                  <p className="text-[10px] text-slate-500">{t.riskLevel}</p>
                  <p className={`font-semibold ${
                    riskLevel === 'low' ? 'text-neon-green' : riskLevel === 'medium' ? 'text-neon-yellow' : 'text-red-400'
                  }`}>
                    {riskLabel}
                  </p>
                </div>
                <div className="rounded-xl bg-black/40 p-3">
                  <p className="text-[10px] text-slate-500">{t.confidence}</p>
                  <p className="font-semibold text-neon-purple">{signalResult.confidence}%</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3">
                  <p className="text-[10px] text-slate-500">RSI</p>
                  <p className="font-semibold text-white">{signalResult.indicators.rsi}</p>
                </div>
              </div>

              <div className="mb-4 text-center">
                <p className="text-xs text-slate-500">{t.countdown}</p>
                <motion.p
                  className={`font-display text-3xl font-bold ${seconds <= 5 ? 'text-red-400' : 'text-neon-blue'}`}
                  animate={seconds <= 5 ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
                  transition={{ duration: 0.8, repeat: seconds <= 5 ? Infinity : 0 }}
                >
                  {formatted}
                </motion.p>
              </div>

              <div className="mb-4 rounded-xl bg-black/40 p-3 text-center">
                <p className="text-[10px] text-slate-500">{t.currentPrice}</p>
                <motion.p
                  key={signalCurrentPrice ?? 0}
                  initial={{ scale: 1.02 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-prime-gold"
                >
                  {formatPrice(signalCurrentPrice ?? signalResult.entryPrice)}
                </motion.p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {t.entry}: {formatPrice(signalResult.entryPrice)} · {t.liveFromPo}
                </p>
              </div>

              <p className="text-center text-[10px] text-slate-600">{t.disclaimer}</p>
            </motion.div>
          )}

          {signalPhase === 'settled' && signalResult && settlement && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              {settlement.outcome === 'win' ? (
                <div className="mb-4 rounded-2xl border border-neon-green/40 bg-gradient-to-br from-neon-green/20 to-emerald-900/20 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-green text-3xl text-black">
                    ✓
                  </div>
                  <h3 className="text-2xl font-bold text-neon-green text-glow-green">{t.tradeWon}</h3>
                  {overlayLabel && (
                    <p className="mt-2 text-sm text-emerald-300">
                      {overlayLabel} — {t.successCoverage}
                    </p>
                  )}
                </div>
              ) : settlement.outcome === 'undetermined' ? (
                <div className="mb-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-900/20 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-3xl text-black">
                    =
                  </div>
                  <h3 className="text-2xl font-bold text-amber-300">{t.tradeDraw}</h3>
                  <p className="mt-2 text-xs text-slate-400">{t.resultUndetermined}</p>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/20 to-red-900/20 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 text-3xl text-white">
                    ✕
                  </div>
                  <h3 className="text-2xl font-bold text-red-400">{t.tradeLost}</h3>
                  {nextMultiplier && (
                    <p className="mt-3 text-sm text-slate-400">{t.martingaleHint}</p>
                  )}
                  {!nextMultiplier && (
                    <p className="mt-3 text-sm text-slate-400">{t.stopTradingAsset}</p>
                  )}
                </div>
              )}

              <div className="mb-4 space-y-2 rounded-2xl bg-black/40 p-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">{t.asset}</span>
                  <span className="font-semibold text-white">{selectedAsset.symbol}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-slate-500">{t.direction}</span>
                  <span className={`font-bold ${settlement.direction === 'CALL' ? 'text-neon-green' : 'text-red-400'}`}>
                    {settlement.direction === 'CALL' ? `${t.buy} ↗` : `${t.sell} ↘`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-slate-500">{t.entry}</span>
                  <span className="font-semibold text-prime-gold">{formatPrice(settlement.entryPrice)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">{t.exitPrice}</span>
                  <span className="font-semibold text-prime-gold">
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
                  🔄 {t.getCoverage} — {nextMultiplier === 2 ? t.coverageOverlay1 : t.coverageOverlay2}
                </motion.button>
              )}

              {(settlement.outcome === 'win' || settlement.outcome === 'undetermined' || !nextMultiplier) && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => resetSignalSession()}
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
