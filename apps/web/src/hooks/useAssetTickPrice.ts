import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

/** Poll /api/ticks — only show prices confirmed from Pocket Option (live stream or PO catalog). */
export function useAssetTickPrice(
  symbol: string,
  seedPayout: number,
): { price: number | null; payout: number; live: boolean } {
  const [price, setPrice] = useState<number | null>(null);
  const [payout, setPayout] = useState(seedPayout);
  const [live, setLive] = useState(false);
  const sinceRef = useRef(0);

  useEffect(() => {
    sinceRef.current = 0;
    setPrice(null);
    setLive(false);
    setPayout(seedPayout);
  }, [symbol, seedPayout]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.getTicks(symbol, sinceRef.current);
        if (cancelled) return;
        if (data.payout != null) setPayout(data.payout);
        if (data.live && data.latest != null) {
          setLive(true);
          setPrice(data.latest);
          if (data.ticks.length > 0) {
            sinceRef.current = data.ticks[data.ticks.length - 1]!.ts;
          }
          return;
        }
        if (data.catalog != null) {
          setLive(false);
          setPrice(data.catalog);
          return;
        }
        setLive(false);
        setPrice(null);
      } catch {
        /* keep last known PO price */
      }
    };

    void poll();
    const id = setInterval(poll, 400);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol]);

  return { price, payout, live };
}
