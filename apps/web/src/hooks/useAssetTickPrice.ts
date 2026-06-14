import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { isPlausibleAssetPrice } from '../utils/price-validation';

/** Poll /api/ticks + PO price from bridge list (scan/catalog — real, not fake). */
export function useAssetTickPrice(
  symbol: string,
  seedPayout: number,
  bridgePrice: number | null,
): { price: number | null; payout: number; live: boolean } {
  const [price, setPrice] = useState<number | null>(
    bridgePrice != null && isPlausibleAssetPrice(bridgePrice, symbol) ? bridgePrice : null,
  );
  const [payout, setPayout] = useState(seedPayout);
  const [live, setLive] = useState(false);
  const sinceRef = useRef(0);

  useEffect(() => {
    sinceRef.current = 0;
    const seed =
      bridgePrice != null && isPlausibleAssetPrice(bridgePrice, symbol) ? bridgePrice : null;
    setPrice(seed);
    setLive(false);
    setPayout(seedPayout);
  }, [symbol, seedPayout, bridgePrice]);

  const selectedSymbol = useAppStore((s) => s.selectedAsset?.symbol);
  const isFocused = selectedSymbol === symbol;

  useEffect(() => {
    if (!isFocused) return;
    void api.requestFocus(symbol, 120_000).catch(() => {});
  }, [isFocused, symbol]);

  useEffect(() => {
    let cancelled = false;

    const applyBridge = () => {
      if (bridgePrice != null && isPlausibleAssetPrice(bridgePrice, symbol)) {
        setLive(false);
        setPrice(bridgePrice);
      }
    };

    const poll = async () => {
      if (useAppStore.getState().signalPhase === 'loading') return;
      try {
        const data = await api.getTicks(symbol, sinceRef.current, {
          timeoutMs: isFocused ? 600 : 800,
        });
        if (cancelled) return;
        if (data.payout != null) setPayout(data.payout);
        if (data.display != null && isPlausibleAssetPrice(data.display, symbol)) {
          setLive(Boolean(data.live));
          setPrice(data.display);
          return;
        }
        if (data.live && data.latest != null && isPlausibleAssetPrice(data.latest, symbol)) {
          setLive(true);
          setPrice(data.latest);
          if (data.ticks.length > 0) {
            sinceRef.current = data.ticks[data.ticks.length - 1]!.ts;
          }
          return;
        }
        if (data.catalog != null && isPlausibleAssetPrice(data.catalog, symbol)) {
          setLive(false);
          setPrice(data.catalog);
          return;
        }
        if (data.latest != null && isPlausibleAssetPrice(data.latest, symbol)) {
          setLive(false);
          setPrice(data.latest);
          return;
        }
        if (data.ticks.length > 0) {
          const last = data.ticks[data.ticks.length - 1]!;
          if (isPlausibleAssetPrice(last.price, symbol)) {
            sinceRef.current = last.ts;
            setLive(Boolean(data.live));
            setPrice(last.price);
            return;
          }
        }
        applyBridge();
        const storePrice = useAppStore
          .getState()
          .assets.find((a) => a.symbol === symbol)?.lastKnownPrice;
        if (storePrice != null && isPlausibleAssetPrice(storePrice, symbol)) {
          setLive(false);
          setPrice(storePrice);
        }
      } catch {
        applyBridge();
      }
    };

    void poll();
    const id = setInterval(poll, isFocused ? 120 : 300);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, bridgePrice, isFocused]);

  return { price, payout, live };
}
