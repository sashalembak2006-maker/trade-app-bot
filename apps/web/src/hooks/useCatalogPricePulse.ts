import { useEffect, useRef, useState } from 'react';

/** Client-side micro-ticks between API polls — smooth OTC list display. */
export function useCatalogPricePulse(
  symbol: string,
  anchor: number | null | undefined,
  livePrice: number | null | undefined,
): number | null {
  const [pulse, setPulse] = useState<number | null>(anchor ?? livePrice ?? null);
  const anchorRef = useRef(anchor);
  const liveRef = useRef(livePrice);

  useEffect(() => {
    anchorRef.current = anchor;
    liveRef.current = livePrice;
    if (livePrice != null) {
      setPulse(livePrice);
      return;
    }
    if (anchor != null) setPulse(anchor);
  }, [symbol, anchor, livePrice]);

  useEffect(() => {
    if (livePrice != null) return;
    if (anchor == null) return;
    const id = setInterval(() => {
      const base = liveRef.current ?? anchorRef.current;
      if (base == null) return;
      const delta = (Math.random() - 0.5) * base * 0.0025;
      const next = Math.round((base + delta) * 100_000) / 100_000;
      setPulse(next);
      anchorRef.current = next;
    }, 120);
    return () => clearInterval(id);
  }, [symbol, anchor, livePrice]);

  return livePrice ?? pulse;
}
