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

function generateCandles(count: number): Candle[] {
  const candles: Candle[] = [];
  let price = 50;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.45) * 8;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    candles.push({ x: i, open, close, high, low, bullish: close > open });
    price = close;
  }
  return candles;
}

export function CandlestickChart({ height = 120 }: { height?: number }) {
  const candles = useMemo(() => generateCandles(24), []);
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  const scale = (v: number) => height - ((v - min) / range) * (height - 20) - 10;
  const candleWidth = 10;
  const gap = 4;

  return (
    <svg viewBox={`0 0 ${candles.length * (candleWidth + gap)} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(168,85,247,0.2)" />
          <stop offset="100%" stopColor="rgba(168,85,247,0)" />
        </linearGradient>
      </defs>

      {candles.map((c, i) => {
        const x = i * (candleWidth + gap) + candleWidth / 2;
        const color = c.bullish ? '#22c55e' : '#ef4444';
        const bodyTop = scale(Math.max(c.open, c.close));
        const bodyBottom = scale(Math.min(c.open, c.close));
        const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

        return (
          <motion.g
            key={c.x}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
          >
            <line
              x1={x}
              y1={scale(c.high)}
              x2={x}
              y2={scale(c.low)}
              stroke={color}
              strokeWidth={1.5}
              opacity={0.8}
            />
            <motion.rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
              rx={1}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
            />
          </motion.g>
        );
      })}
    </svg>
  );
}
