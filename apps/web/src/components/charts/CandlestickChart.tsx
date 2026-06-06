import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Candle {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  bullish: boolean;
}

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function generateCandles(count: number, seed: number, basePrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice > 0 ? basePrice : 50 + (seed % 40);
  let rng = seed || 1;
  const rand = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  for (let i = 0; i < count; i++) {
    const bias = i % 5 === 0 ? 0.55 : 0.5;
    const change = (rand() - (1 - bias)) * price * 0.004;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + rand() * price * 0.002;
    const low = Math.min(open, close) - rand() * price * 0.002;
    candles.push({ x: i, open, close, high, low, bullish: close > open });
    price = close;
  }
  return candles;
}

export function CandlestickChart({
  height = 120,
  symbol = 'BTC/USD',
  basePrice = 0,
}: {
  height?: number;
  symbol?: string;
  basePrice?: number;
}) {
  const candles = useMemo(
    () => generateCandles(24, hashSeed(symbol), basePrice),
    [symbol, basePrice],
  );
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  const scale = (v: number) => height - ((v - min) / range) * (height - 20) - 10;
  const candleWidth = 10;
  const gap = 4;

  return (
    <svg viewBox={`0 0 ${candles.length * (candleWidth + gap)} ${height}`} className="w-full" style={{ height }}>
      {candles.map((c) => {
        const x = c.x * (candleWidth + gap);
        const color = c.bullish ? '#22c55e' : '#ef4444';
        const bodyTop = scale(Math.max(c.open, c.close));
        const bodyBottom = scale(Math.min(c.open, c.close));
        const bodyH = Math.max(2, bodyBottom - bodyTop);
        const cx = x + candleWidth / 2;
        return (
          <g key={c.x}>
            <line x1={cx} y1={scale(c.high)} x2={cx} y2={scale(c.low)} stroke={color} strokeWidth="1" />
            <motion.rect
              x={x}
              y={bodyTop}
              width={candleWidth}
              height={bodyH}
              fill={color}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: c.x * 0.02, duration: 0.3 }}
              style={{ transformOrigin: `${x + candleWidth / 2}px ${bodyBottom}px` }}
            />
          </g>
        );
      })}
    </svg>
  );
}
