import type { NewsItem } from '../types';

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'n1',
    title: 'ЄЦБ зберігає ставку на рівні 4.5%',
    summary: 'Європейський центральний банк підтвердив поточну монетарну політику на тлі стабілізації інфляції в єврозоні.',
    category: 'economy',
    date: '06.06.2026',
    source: 'Reuters',
    imageGradient: 'from-neon-blue/40 to-neon-purple/40',
  },
  {
    id: 'n2',
    title: 'Bitcoin пробиває $67,000',
    summary: 'Криптовалюта демонструє сильний імпульс на тлі зростання інституційного попиту та позитивних макроданих.',
    category: 'crypto',
    date: '06.06.2026',
    source: 'CoinDesk',
    imageGradient: 'from-neon-yellow/40 to-neon-green/40',
  },
  {
    id: 'n3',
    title: 'EUR/USD: тиск на євро посилюється',
    summary: 'Пара коригується після публікації слабких даних PMI з Німеччини. Трейдери очікують рівень 1.0800.',
    category: 'forex',
    date: '05.06.2026',
    source: 'FXStreet',
    imageGradient: 'from-neon-purple/40 to-neon-pink/40',
  },
  {
    id: 'n4',
    title: 'Золото досягає нового максимуму',
    summary: 'XAU/USD торгується біля $2,350 на тлі геополітичної напруженості та зниження реальних доходностей.',
    category: 'forex',
    date: '05.06.2026',
    source: 'Bloomberg',
    imageGradient: 'from-neon-yellow/40 to-neon-blue/30',
  },
  {
    id: 'n5',
    title: 'Ethereum ETF: рекордні притоки',
    summary: 'Інституційні інвестори активно купують ETH через спотові ETF, підтримуючи бичачий тренд.',
    category: 'crypto',
    date: '04.06.2026',
    source: 'The Block',
    imageGradient: 'from-neon-green/40 to-neon-blue/40',
  },
  {
    id: 'n6',
    title: 'США: ринок праці стабілізується',
    summary: 'Non-Farm Payrolls перевищили очікування, що зміцнює долар проти основних валют.',
    category: 'economy',
    date: '04.06.2026',
    source: 'CNBC',
    imageGradient: 'from-neon-blue/40 to-neon-green/30',
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  forex: 'Форекс',
  crypto: 'Крипта',
  economy: 'Економіка',
};
