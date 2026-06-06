import type { OHLCV, SignalDirection, SignalRequest, SignalResult, TradeSettlement, MartingaleMultiplier } from '../types/index.js';
import {
  calculateBollinger,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateVolatility,
  detectTrend,
  findSupportResistance,
} from './indicators.js';

export function generateMockCandles(basePrice: number, count = 60): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.002;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.001;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.001;
    candles.push({
      time: now - (count - i) * 60000,
      open,
      high,
      low,
      close,
      volume: 1000 + Math.random() * 5000,
    });
    price = close;
  }
  return candles;
}

function timeframeToMs(tf: string): number {
  const map: Record<string, number> = {
    '3s': 3000, '5s': 5000, '15s': 15000, '30s': 30000,
    '1m': 60000, '2m': 120000, '3m': 180000, '5m': 300000,
    '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000,
  };
  return map[tf] ?? 60000;
}

export class SignalEngine {
  generate(request: SignalRequest): SignalResult {
    const candles = generateMockCandles(request.price, 80);
    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];
    const rsi = calculateRSI(closes);
    const { macd, signal: macdSignal } = calculateMACD(closes);
    const bollinger = calculateBollinger(closes);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const trend = detectTrend(closes);
    const volatility = calculateVolatility(candles);
    const { support, resistance } = findSupportResistance(candles);

    let callScore = 0;
    let putScore = 0;

    if (trend === 'up') callScore += 25;
    if (trend === 'down') putScore += 25;

    const distToSupport = (currentPrice - support) / currentPrice;
    const distToResistance = (resistance - currentPrice) / currentPrice;
    if (distToSupport < 0.003) callScore += 20;
    if (distToResistance < 0.003) putScore += 20;

    if (rsi < 35) callScore += 20;
    if (rsi > 65) putScore += 20;
    if (rsi >= 45 && rsi <= 55) {
      callScore += 5;
      putScore += 5;
    }

    if (macd > macdSignal) callScore += 15;
    if (macd < macdSignal) putScore += 15;

    if (currentPrice < bollinger.lower) callScore += 10;
    if (currentPrice > bollinger.upper) putScore += 10;

    const lastEma21 = ema21[ema21.length - 1];
    const lastEma50 = ema50[ema50.length - 1];
    if (lastEma21 > lastEma50) callScore += 10;
    if (lastEma21 < lastEma50) putScore += 10;

    const last3 = candles.slice(-3);
    const bullishMomentum = last3.filter((c) => c.close > c.open).length;
    if (bullishMomentum >= 2) callScore += 10;
    if (bullishMomentum <= 1) putScore += 10;

    const direction = callScore >= putScore ? 'CALL' : 'PUT';
    const winningScore = Math.max(callScore, putScore);
    const totalScore = callScore + putScore || 1;
    const confidence = Math.min(95, Math.max(55, Math.round((winningScore / totalScore) * 100)));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeframeToMs(request.timeframe));

    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId: request.assetId,
      symbol: request.symbol,
      direction,
      timeframe: request.timeframe,
      // Entry price must equal the live provider/bridge price so it matches the
      // trading platform. The synthetic candle window is only used to derive the
      // direction/indicators (we only receive a single price snapshot).
      entryPrice: request.price,
      confidence,
      payout: request.payout,
      market: request.isOTC ? 'OTC' : 'MARKET',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      callScore,
      putScore,
      lowPayoutWarning: request.payout < 60,
      indicators: {
        rsi: Math.round(rsi * 10) / 10,
        macd: Math.round(macd * 100000) / 100000,
        macdSignal: Math.round(macdSignal * 100000) / 100000,
        ema21: lastEma21,
        ema50: lastEma50,
        bollingerUpper: bollinger.upper,
        bollingerLower: bollinger.lower,
        trend,
        volatility: Math.round(volatility * 100) / 100,
      },
    };
  }
}

export function settleSignal(
  direction: SignalDirection,
  entryPrice: number,
  exitPrice: number,
  multiplier: MartingaleMultiplier = 1,
): TradeSettlement {
  if (exitPrice === entryPrice) {
    return { outcome: 'undetermined', entryPrice, exitPrice, direction, multiplier };
  }

  const won =
    direction === 'CALL' ? exitPrice > entryPrice : exitPrice < entryPrice;

  return {
    outcome: won ? 'win' : 'loss',
    entryPrice,
    exitPrice,
    direction,
    multiplier,
  };
}

export function nextMartingaleMultiplier(current: MartingaleMultiplier): MartingaleMultiplier | null {
  if (current === 1) return 2;
  if (current === 2) return 4;
  return null;
}

export function calculateMartingale(
  deposit: number,
  firstBetPercent: number,
  multiplier: number,
  levels: number,
  payoutPercent: number,
): import('../types/index.js').CalculatorResult {
  const firstBet = Math.round((deposit * firstBetPercent) / 100 * 100) / 100;
  const rows: import('../types/index.js').MartingaleRow[] = [];
  let bet = firstBet;
  let totalRisk = 0;

  for (let step = 1; step <= levels; step++) {
    const potentialProfit = Math.round(bet * (payoutPercent / 100) * 100) / 100;
    totalRisk = Math.round((totalRisk + bet) * 100) / 100;
    rows.push({ step, bet: Math.round(bet * 100) / 100, potentialProfit, totalRisk });
    bet = Math.round(bet * multiplier * 100) / 100;
  }

  return {
    firstBet,
    totalRisk,
    riskPercent: Math.round((totalRisk / deposit) * 10000) / 100,
    rows,
  };
}
