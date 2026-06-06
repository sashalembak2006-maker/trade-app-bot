import type { VipPlan, VipSignal } from '../types';

export const VIP_BENEFITS = [
  'Ексклюзивні торгові сигнали з точністю 85%+',
  'Пріоритетний AI-аналіз ринку в реальному часі',
  'Доступ до закритого VIP-каналу в Telegram',
  'Персональні рекомендації по активах OTC',
  'Ранній доступ до нових функцій бота',
  'Підтримка від професійних аналітиків 24/7',
];

export const VIP_PLANS: VipPlan[] = [
  {
    id: 'week',
    name: 'Тижневий',
    price: '299 ₴',
    period: '7 днів',
    features: ['5 сигналів на день', 'Базовий AI-аналіз', 'Доступ до VIP-каналу'],
  },
  {
    id: 'month',
    name: 'Місячний',
    price: '799 ₴',
    period: '30 днів',
    features: ['15 сигналів на день', 'Повний AI-аналіз', 'Пріоритетна підтримка', 'OTC сигнали'],
    popular: true,
  },
  {
    id: 'quarter',
    name: 'Квартальний',
    price: '1 999 ₴',
    period: '90 днів',
    features: ['Необмежені сигнали', 'Персональний аналітик', 'Всі OTC активи', 'Ексклюзивні стратегії'],
  },
];

export const VIP_SIGNALS: VipSignal[] = [
  { id: 'vs1', asset: 'BTC/USD', direction: 'CALL', confidence: 89, expiry: '5 хв', locked: false },
  { id: 'vs2', asset: 'EUR/USD', direction: 'PUT', confidence: 84, expiry: '3 хв', locked: false },
  { id: 'vs3', asset: 'XAU/USD', direction: 'CALL', confidence: 91, expiry: '10 хв', locked: true },
  { id: 'vs4', asset: 'GBP/USD', direction: 'PUT', confidence: 87, expiry: '5 хв', locked: true },
  { id: 'vs5', asset: 'ETH/USD', direction: 'CALL', confidence: 93, expiry: '15 хв', locked: true },
];

export const LEARNING_CARDS = [
  {
    id: 'l1',
    title: 'Що таке Pocket Option',
    description:
      'Дізнайтеся про платформу бінарних опціонів: як реєструватися, поповнювати рахунок, обирати активи та відкривати угоди.',
    duration: '8 хв',
    level: 'Початківець' as const,
    icon: '📱',
  },
  {
    id: 'l2',
    title: 'Як читати свічки',
    description:
      'Освойте японські свічки: тіло, тіні, патерни розвороту (молот, поглинання) та продовження тренду.',
    duration: '12 хв',
    level: 'Початківець' as const,
    icon: '🕯️',
  },
  {
    id: 'l3',
    title: 'Стратегії входу',
    description:
      'Ефективні стратегії для бінарних опціонів: пробій рівнів, відскок від MA, торгівля за трендом на M5.',
    duration: '15 хв',
    level: 'Середній' as const,
    icon: '🎯',
  },
  {
    id: 'l4',
    title: 'Мані-менеджмент',
    description:
      'Правило 1-2% ризику, розрахунок розміру позиції, управління капіталом та захист депозиту від просадок.',
    duration: '10 хв',
    level: 'Середній' as const,
    icon: '💰',
  },
  {
    id: 'l5',
    title: 'Психологія трейдингу',
    description:
      'Контроль емоцій, дисципліна, уникнення помилок FOMO та revenge trading. Як зберігати холодний розум.',
    duration: '14 хв',
    level: 'Просунутий' as const,
    icon: '🧠',
  },
];
