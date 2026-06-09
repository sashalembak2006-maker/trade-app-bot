import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

/** Poll /api/ticks?since= — creator-style live price per pair. */
export function useAssetTickPrice(
  symbol: string,
  seedPrice: number | null,
  seedPayout: number,
): { price: number | null; payout: number } {
  const [price, setPrice] = useState<number | null>(seedPrice);
  const [payout, setPayout] = useState(seedPayout);
  const sinceRef = useRef(0);

  useEffect(() => {
    sinceRef.current = 0;
    setPrice(seedPrice);
    setPayout(seedPayout);
  }, [symbol, seedPrice, seedPayout]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.getTicks(symbol, sinceRef.current);
        if (cancelled) return;
        if (data.payout != null) setPayout(data.payout);
        if (data.ticks.length > 0) {
          const last = data.ticks[data.ticks.length - 1]!;
          sinceRef.current = last.ts;
          setPrice(last.price);
        } else if (data.latest != null) {
          setPrice(data.latest);
        }
      } catch {
        /* keep last price */
      }
    };

    void poll();
    const id = setInterval(poll, 200);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol]);

  return { price, payout };
}
