import type { OHLCV, TrendDirection } from '../types/index.js';

export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prev = prices[0] ?? 0;
  for (let i = 0; i < prices.length; i++) {
    prev = i === 0 ? prices[i] : prices[i] * k + prev * (1 - k);
    ema.push(prev);
  }
  return ema;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(closes: number[]): { macd: number; signal: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - (ema26[i] ?? v));
  const signalLine = calculateEMA(macdLine, 9);
  const last = macdLine.length - 1;
  return {
    macd: macdLine[last] ?? 0,
    signal: signalLine[last] ?? 0,
  };
}

export function calculateBollinger(closes: number[], period = 20): { upper: number; lower: number; middle: number } {
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - middle) ** 2, 0) / slice.length;
  const std = Math.sqrt(variance);
  return { upper: middle + 2 * std, lower: middle - 2 * std, middle };
}

export function detectTrend(closes: number[]): TrendDirection {
  if (closes.length < 10) return 'sideways';
  const recent = closes.slice(-10);
  const first = recent.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const last = recent.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const diff = (last - first) / first;
  if (diff > 0.001) return 'up';
  if (diff < -0.001) return 'down';
  return 'sideways';
}

export function calculateVolatility(candles: OHLCV[]): number {
  if (candles.length < 2) return 0;
  const returns = candles.slice(-20).map((c, i, arr) => {
    if (i === 0) return 0;
    return (c.close - arr[i - 1].close) / arr[i - 1].close;
  });
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

export function findSupportResistance(candles: OHLCV[]): { support: number; resistance: number } {
  const lows = candles.slice(-30).map((c) => c.low);
  const highs = candles.slice(-30).map((c) => c.high);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}
