import type { LearningArticle, NewsItem } from '../types/index.js';
import { LEARNING_EXPANDED } from './learning-expanded.js';

export const NEWS: NewsItem[] = [
  { id: 'n1', title: 'ЄЦБ зберігає ставку на рівні 4.5%', summary: 'Європейський центральний банк підтвердив поточну монетарну політику.', category: 'economy', date: '06.06.2026', source: 'Reuters' },
  { id: 'n2', title: 'Bitcoin пробиває $67,000', summary: 'Криптовалюта демонструє сильний імпульс на тлі інституційного попиту.', category: 'crypto', date: '06.06.2026', source: 'CoinDesk' },
  { id: 'n3', title: 'EUR/USD: тиск на євро посилюється', summary: 'Пара коригується після слабких даних PMI з Німеччини.', category: 'forex', date: '05.06.2026', source: 'FXStreet' },
  { id: 'n4', title: 'Золото досягає нового максимуму', summary: 'XAU/USD торгується біля $2,350 на тлі геополітичної напруженості.', category: 'forex', date: '05.06.2026', source: 'Bloomberg' },
  { id: 'n5', title: 'Ethereum ETF: рекордні притоки', summary: 'Інституційні інвестори активно купують ETH через спотові ETF.', category: 'crypto', date: '04.06.2026', source: 'The Block' },
];

export { INDICATORS } from './indicators-data.js';

export const LEARNING: LearningArticle[] = [
  {
    id: 'l1',
    icon: '📚',
    titleUk: 'Основи трейдингу',
    titleEn: 'Trading Basics',
    tab: 'basics',
    duration: '12 хв',
    contentUk:
      'Трейдинг — купівля/продаж активів з метою прибутку від руху ціни.\n\n' +
      '━━━ Ключові терміни ━━━\n' +
      '• Актив — пара (EUR/USD), крипто (BTC), товар (GOLD)\n' +
      '• Експірація — коли угода закривається\n' +
      '• CALL ⬆️ — ціна піде вгору\n' +
      '• PUT ⬇️ — ціна піде вниз\n' +
      '• Payout — % прибутку (напр. 92%)\n\n' +
      '━━━ Приклад угоди ━━━\n' +
      'Депозит $200 → ставка $10 на EUR/USD CALL, експірація 1 хв.\n' +
      'Якщо ціна вище входу через 1 хв → виграш ~$9.20 (при payout 92%).\n' +
      'Якщо нижче → втрата $10.\n\n' +
      '━━━ Крипто vs Форекс ━━━\n' +
      'BTC/USDT рухається швидше за EUR/USD. На крипто краще експірація 1–5 хв з жорстким ризик-менеджментом.\n\n' +
      'Перед стартом: оберіть 2–3 пари, ведіть журнал, не торгуйте на всю суму.',
    contentEn: 'Trading basics: CALL/PUT, expiration, payout. Start with 2–3 pairs and a journal.',
  },
  {
    id: 'l2',
    icon: '🛡️',
    titleUk: 'Ризик-менеджмент',
    titleEn: 'Risk Management',
    tab: 'basics',
    duration: '15 хв',
    guideUrl: '/books/risk-management-guide.html',
    contentUk:
      'Ризик-менеджмент — 80% успіху. Без нього навіть точні сигнали зливають депозит.\n\n' +
      '━━━ Правило 1–2% ━━━\n' +
      'Депозит $500 → макс. $5–10 на угоду. Ніколи «відігратися» подвійною ставкою без плану.\n\n' +
      '━━━ Структура капіталу ━━━\n' +
      '70% — торгівля | 20% — резерв (не чіпати) | 10% — навчання/тести\n\n' +
      '━━━ Приклад: BTC після 3 програшів ━━━\n' +
      '❌ Погано: $10 → $20 → $40 (мартингейл без ліміту)\n' +
      '✅ Добре: стоп після 3 програшів, пауза 30 хв, аналіз журналу\n\n' +
      '━━━ Денні ліміти ━━━\n' +
      '• Макс. просадка 5%/день\n' +
      '• Макс. 10 угод/день для початківців\n' +
      '• Не торгувати під час важливих новин (NFP, FOMC)\n\n' +
      '📥 Відкрийте повний PDF-гайд кнопкою нижче.',
    contentEn: 'Risk 1–2% per trade, daily limits, no revenge trading. See printable guide.',
  },
  {
    id: 'l3',
    icon: '📊',
    titleUk: 'Основи аналізу',
    titleEn: 'Analysis Basics',
    tab: 'basics',
    duration: '18 хв',
    guideUrl: '/books/technical-analysis-guide.html',
    contentUk:
      'Два підходи: технічний (графік) і фундаментальний (новини).\n\n' +
      '━━━ Технічний аналіз ━━━\n' +
      'Графік ETH/USDT:\n' +
      '  $3540 ──╮  тренд вгору (Higher Highs)\n' +
      '         ╱\n' +
      '  $3520 ─●  Higher Low → зона для CALL\n\n' +
      'Індикатори: RSI (перекуп/перепрод), MACD (імпульс), MA (тренд).\n\n' +
      '━━━ Фундаментальний ━━━\n' +
      '• Ставки ФРС → USD\n' +
      '• Звіт по зайнятості (NFP) → волатильність\n' +
      '• Лістинг ETF на BTC → різкі рухи крипто\n\n' +
      'Для експірації 30с–5м: 70% техніка + 30% новини (не торгувати за 5 хв до новини).',
    contentEn: 'Technical vs fundamental. For short expirations prioritize charts + avoid news spikes.',
  },
  ...LEARNING_EXPANDED,
];
