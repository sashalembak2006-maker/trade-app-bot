import type { IndicatorInfo } from '../types/index.js';

const img = (id: string) => `/indicators/${id}.svg`;

export const INDICATORS: IndicatorInfo[] = [
  {
    id: 'rsi',
    nameUk: 'RSI',
    nameEn: 'RSI',
    icon: '⚡',
    imageUrl: img('rsi'),
    shortDescUk: 'Індекс відносної сили — перекупленість / перепроданість',
    shortDescEn: 'Relative Strength Index — overbought / oversold',
    detailUk:
      'RSI (14) показує швидкість зміни ціни від 0 до 100.\n\n' +
      '━━━ Як читати ━━━\n' +
      '• RSI > 70 — перекупленість, ціна «перегріта»\n' +
      '• RSI < 30 — перепроданість, можливий відскок\n' +
      '• RSI 40–60 — нейтральна зона, слабкий сигнал\n\n' +
      '━━━ Приклад EUR/USD ━━━\n' +
      'Ціна біля підтримки + RSI 28 → розглядайте CALL на 1–3 хв.\n' +
      'Ціна біля опору + RSI 74 → розглядайте PUT.\n\n' +
      '━━━ Помилки ━━━\n' +
      'Не входьте лише по RSI у сильному тренді — чекайте відскок від рівня.\n\n' +
      '━━━ Сигнал бота ━━━\n' +
      'Бот враховує RSI разом із трендом і волатильністю пари.',
    detailEn: 'RSI 14: below 30 oversold (CALL bias), above 70 overbought (PUT bias). Confirm with S/R.',
  },
  {
    id: 'macd',
    nameUk: 'MACD',
    nameEn: 'MACD',
    icon: '📈',
    imageUrl: img('macd'),
    shortDescUk: 'Імпульс тренду — перетини ліній',
    shortDescEn: 'Trend momentum — line crossovers',
    detailUk:
      'MACD = різниця двох EMA + сигнальна лінія + гістограма.\n\n' +
      '━━━ Сигнали ━━━\n' +
      '• MACD перетинає сигнальну знизу вгору → імпульс вгору (CALL)\n' +
      '• Перетин зверху вниз → імпульс вниз (PUT)\n' +
      '• Гістограма росте — тренд посилюється\n\n' +
      '━━━ Крипто приклад BTC ━━━\n' +
      'На M5 бичачий перетин після корекції в тренді → експірація 2–5 хв.\n\n' +
      '━━━ Фільтр ━━━\n' +
      'У флеті (ADX < 20) MACD дає багато хибних перетинів — краще не торгувати.',
    detailEn: 'MACD crossovers show momentum. Use with trend filter; avoid in sideways ADX < 20.',
  },
  {
    id: 'bollinger',
    nameUk: 'Смуги Боллінджера',
    nameEn: 'Bollinger Bands',
    icon: '📊',
    imageUrl: img('bollinger'),
    shortDescUk: 'Волатильність і межі ціни',
    shortDescEn: 'Volatility and price boundaries',
    detailUk:
      'Три лінії: середня (MA20) + верхня/нижня смуги (±2σ).\n\n' +
      '━━━ Стратегії ━━━\n' +
      '• Відскок від нижньої смуги → CALL (у тренді вгору)\n' +
      '• Відскок від верхньої → PUT (у тренді вниз)\n' +
      '• «Стискання» смуг → готуйтесь до сильного руху\n\n' +
      '━━━ OTC пари ━━━\n' +
      'На OTC волатильність вища — використовуйте трохи довшу експірацію (2–3 хв).',
    detailEn: 'Bollinger Bands: mean reversion at bands; squeeze signals breakout soon.',
  },
  {
    id: 'ema',
    nameUk: 'EMA',
    nameEn: 'EMA',
    icon: '📉',
    imageUrl: img('ema'),
    shortDescUk: 'Експоненційні ковзні середні',
    shortDescEn: 'Exponential moving averages',
    detailUk:
      'EMA швидше реагує на ціну ніж проста MA.\n\n' +
      '━━━ Класика ━━━\n' +
      '• EMA 21 > EMA 50 → тренд вгору, шукайте CALL на відкатах\n' +
      '• EMA 21 < EMA 50 → тренд вниз, шукайте PUT\n\n' +
      '━━━ Вхід ━━━\n' +
      'Чекайте відкат до EMA21 і свічку підтвердження — не гоніться за ціною.\n\n' +
      '━━━ Експірація ━━━\n' +
      'За трендом H1 — на M1–M5 ставте 1–5 хв відповідно до сили імпульсу.',
    detailEn: 'EMA 21/50 crossover defines trend. Enter on pullbacks to EMA21.',
  },
  {
    id: 'stochastic',
    nameUk: 'Стохастик',
    nameEn: 'Stochastic',
    icon: '〰️',
    imageUrl: img('stochastic'),
    shortDescUk: 'Осцилятор %K і %D',
    shortDescEn: '%K and %D oscillator',
    detailUk:
      'Порівнює ціну закриття з діапазоном за період.\n\n' +
      '━━━ Зони ━━━\n' +
      '• > 80 — перекупленість\n' +
      '• < 20 — перепроданість\n\n' +
      '━━━ Сигнал ━━━\n' +
      '%K перетинає %D знизу в зоні < 20 → CALL\n' +
      '%K перетинає %D зверху в зоні > 80 → PUT\n\n' +
      '━━━ Порада ━━━\n' +
      'Комбінуйте з рівнем підтримки — подвійне підтвердження підвищує якість входу.',
    detailEn: 'Stochastic crossovers in extreme zones. Combine with support/resistance.',
  },
  {
    id: 'adx',
    nameUk: 'ADX',
    nameEn: 'ADX',
    icon: '💪',
    imageUrl: img('adx'),
    shortDescUk: 'Сила тренду (не напрямок)',
    shortDescEn: 'Trend strength (not direction)',
    detailUk:
      'ADX показує наскільки сильний тренд, без напрямку.\n\n' +
      '━━━ Шкала ━━━\n' +
      '• ADX < 20 — флет, краще пропустити\n' +
      '• ADX 20–25 — слабкий тренд\n' +
      '• ADX > 25 — сильний тренд, торгуйте за напрямком EMA/MACD\n' +
      '• ADX > 40 — дуже сильний рух (обережно з розворотами)\n\n' +
      '━━━ Практика ━━━\n' +
      'Спочатку ADX > 25, потім сигнал RSI/MACD у напрямку тренду.',
    detailEn: 'ADX > 25 = trending market. Skip signals when ADX < 20 (choppy).',
  },
  {
    id: 'sr',
    nameUk: 'Підтримка / Опір',
    nameEn: 'Support / Resistance',
    icon: '🎯',
    imageUrl: img('sr'),
    shortDescUk: 'Ключові цінові рівні',
    shortDescEn: 'Key price levels',
    detailUk:
      'Рівні, де ціна раніше розверталась.\n\n' +
      '━━━ Підтримка ━━━\n' +
      'Підлога ціни. Відскок + підтвердження → CALL.\n' +
      'Пробій вниз з обсягом → PUT на ретесті.\n\n' +
      '━━━ Опір ━━━\n' +
      'Стеля ціни. Відхилення → PUT.\n' +
      'Пробій вгору → CALL на закріпленні.\n\n' +
      '━━━ Психологічні рівні ━━━\n' +
      'BTC 67,000 / EUR 1.10 — круглі числа часто працюють як магніти.',
    detailEn: 'Support/resistance bounces and breakouts. Round numbers matter on crypto.',
  },
  {
    id: 'volume',
    nameUk: 'Обсяг',
    nameEn: 'Volume',
    icon: '📦',
    imageUrl: img('volume'),
    shortDescUk: 'Підтвердження сили руху',
    shortDescEn: 'Confirms move strength',
    detailUk:
      'Обсяг показує активність учасників ринку.\n\n' +
      '━━━ Правила ━━━\n' +
      '• Ріст ціни + високий обсяг = сильний рух\n' +
      '• Ріст ціни + низький обсяг = слабкий, можливий розворот\n' +
      '• Сплеск обсягу на пробої рівня — підтвердження\n\n' +
      '━━━ Крипто ━━━\n' +
      'На BTC стрибки обсягу часто передують різким свічкам — не входьте проти імпульсу.',
    detailEn: 'Volume confirms breakouts. Low volume rallies are unreliable.',
  },
  {
    id: 'imbalance',
    nameUk: 'Імбаланс (FVG)',
    nameEn: 'Imbalance (FVG)',
    icon: '⚖️',
    imageUrl: img('imbalance'),
    shortDescUk: 'Ціновий пробіл — Fair Value Gap',
    shortDescEn: 'Fair Value Gap',
    detailUk:
      'FVG — зона, куди ціна рухалась занадто швидко і не залишила «справедливої» торгівлі.\n\n' +
      '━━━ Як знайти ━━━\n' +
      'Три свічки: середня з великим тілом, gap між тінями 1-ї і 3-ї.\n\n' +
      '━━━ Торгівля ━━━\n' +
      '1. Позначте FVG на M5–M15\n' +
      '2. Дочекайтесь повернення ціни в зону\n' +
      '3. Вхід у напрямку заповнення (часто 50–100% gap)\n\n' +
      'Експірація 2–5 хв після входу в зону.',
    detailEn: 'FVG fill strategy on M5–M15. Enter when price returns to the gap zone.',
  },
  {
    id: 'fractal',
    nameUk: 'Фрактал',
    nameEn: 'Fractal',
    icon: '🔺',
    imageUrl: img('fractal'),
    shortDescUk: 'Локальні максимуми і мінімуми',
    shortDescEn: 'Local highs and lows',
    detailUk:
      'Фрактал = 5 свічок, середня вища/нижча за дві з кожного боку.\n\n' +
      '━━━ Верхній фрактал ━━━\n' +
      'Локальний максимум → потенційний PUT біля опору.\n\n' +
      '━━━ Нижній фрактал ━━━\n' +
      'Локальний мінімум → потенційний CALL біля підтримки.\n\n' +
      '━━━ Фільтр ━━━\n' +
      'Не торгуйте кожен фрактал — лише на ключових рівнях + підтвердження RSI.',
    detailEn: 'Fractals mark swing points. Trade only at key S/R with confirmation.',
  },
];
