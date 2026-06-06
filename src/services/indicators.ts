import type { Indicator } from '../types';

export const INDICATORS: Indicator[] = [
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    shortName: 'RSI',
    description:
      'Індикатор сили тренду, що вимірює швидкість і величину цінових рухів. Значення вище 70 сигналізує про перекупленість, нижче 30 — про перепроданість.',
    signal: 'bullish',
    value: '58.4',
    color: 'purple',
  },
  {
    id: 'macd',
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    description:
      'Показує взаємозв\'язок між двома ковзними середніми ціни. Перетин ліній MACD і сигнальної лінії вказує на зміну імпульсу.',
    signal: 'bullish',
    value: '+0.0024',
    color: 'blue',
  },
  {
    id: 'bollinger',
    name: 'Bollinger Bands',
    shortName: 'Bollinger Bands',
    description:
      'Волатильні смуги навколо ковзної середньої. Ціна біля верхньої смуги — перекупленість, біля нижньої — перепроданість.',
    signal: 'neutral',
    value: 'Середина',
    color: 'yellow',
  },
  {
    id: 'ma',
    name: 'Moving Average',
    shortName: 'Moving Average',
    description:
      'Ковзна середня згладжує цінові коливання та визначає напрямок тренду. Ціна вище MA — бичачий тренд, нижче — ведмежий.',
    signal: 'bullish',
    value: 'EMA 21 ↑',
    color: 'green',
  },
  {
    id: 'stochastic',
    name: 'Stochastic Oscillator',
    shortName: 'Stochastic',
    description:
      'Порівнює поточну ціну закриття з діапазоном цін за певний період. Допомагає визначити точки розвороту тренду.',
    signal: 'bearish',
    value: '72.1',
    color: 'purple',
  },
];
