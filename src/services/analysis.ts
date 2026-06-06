import type { MarketAnalysis } from '../types';

export const DEFAULT_ANALYSIS: MarketAnalysis = {
  asset: 'BTC/USD',
  signal: 'bullish',
  confidence: 78,
  trend: 'up',
  sentiment: 72,
  entrySuggestion: 'CALL — вхід після відскоку від EMA 21 на M5',
  expiryMinutes: 5,
  support: 66800,
  resistance: 67850,
  rsi: 58.4,
  macd: 'Бичачий перетин',
};

export function generateAnalysis(assetSymbol: string): MarketAnalysis {
  const seed = assetSymbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const signals: MarketAnalysis['signal'][] = ['bullish', 'bearish', 'neutral'];
  const trends: MarketAnalysis['trend'][] = ['up', 'down', 'sideways'];
  const signal = signals[seed % 3];
  const trend = trends[seed % 3];
  const confidence = 65 + (seed % 30);
  const sentiment = 45 + (seed % 50);

  const basePrice = assetSymbol.includes('BTC') ? 67245 : assetSymbol.includes('EUR') ? 1.0842 : 156.42;

  return {
    asset: assetSymbol,
    signal,
    confidence,
    trend,
    sentiment,
    entrySuggestion:
      signal === 'bullish'
        ? 'CALL — вхід на підтвердженні пробою опору'
        : signal === 'bearish'
          ? 'PUT — вхід після відхилення від опору'
          : 'Очікування — краще утриматися від угоди',
    expiryMinutes: 3 + (seed % 8),
    support: Math.round(basePrice * 0.992 * 100) / 100,
    resistance: Math.round(basePrice * 1.008 * 100) / 100,
    rsi: 30 + (seed % 50),
    macd: signal === 'bullish' ? 'Бичачий перетин' : signal === 'bearish' ? 'Ведмежий перетин' : 'Нейтральна зона',
  };
}
