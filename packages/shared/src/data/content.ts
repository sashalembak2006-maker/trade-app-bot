import type { IndicatorInfo, LearningArticle, NewsItem } from '../types/index.js';

export const NEWS: NewsItem[] = [
  { id: 'n1', title: 'ЄЦБ зберігає ставку на рівні 4.5%', summary: 'Європейський центральний банк підтвердив поточну монетарну політику.', category: 'economy', date: '06.06.2026', source: 'Reuters' },
  { id: 'n2', title: 'Bitcoin пробиває $67,000', summary: 'Криптовалюта демонструє сильний імпульс на тлі інституційного попиту.', category: 'crypto', date: '06.06.2026', source: 'CoinDesk' },
  { id: 'n3', title: 'EUR/USD: тиск на євро посилюється', summary: 'Пара коригується після слабких даних PMI з Німеччини.', category: 'forex', date: '05.06.2026', source: 'FXStreet' },
  { id: 'n4', title: 'Золото досягає нового максимуму', summary: 'XAU/USD торгується біля $2,350 на тлі геополітичної напруженості.', category: 'forex', date: '05.06.2026', source: 'Bloomberg' },
  { id: 'n5', title: 'Ethereum ETF: рекордні притоки', summary: 'Інституційні інвестори активно купують ETH через спотові ETF.', category: 'crypto', date: '04.06.2026', source: 'The Block' },
];

export const INDICATORS: IndicatorInfo[] = [
  { id: 'bollinger', nameUk: 'Смуги Боллінджера', nameEn: 'Bollinger Bands', shortDescUk: 'Волатильні смуги навколо ковзної середньої', shortDescEn: 'Volatility bands around moving average', detailUk: 'Смуги Боллінджера складаються з ковзної середньої та двох стандартних відхилень. Ціна біля верхньої смуги вказує на перекупленість, біля нижньої — на перепроданість. Використовуйте для визначення волатильності та потенційних точок розвороту.', detailEn: 'Bollinger Bands consist of a moving average and two standard deviations. Price near upper band suggests overbought, near lower band suggests oversold.', icon: '📊' },
  { id: 'macd', nameUk: 'MACD', nameEn: 'MACD', shortDescUk: 'Конвергенція/дивергенція ковзних середніх', shortDescEn: 'Moving Average Convergence Divergence', detailUk: 'MACD показує взаємозв\'язок між двома EMA. Перетин MACD-лінії та сигнальної лінії вказує на зміну імпульсу. Бичачий перетин — сигнал на покупку, ведмежий — на продаж.', detailEn: 'MACD shows relationship between two EMAs. Crossovers indicate momentum shifts.', icon: '📈' },
  { id: 'stochastic', nameUk: 'Стохастик', nameEn: 'Stochastic', shortDescUk: 'Осцилятор перекупленості/перепроданості', shortDescEn: 'Overbought/oversold oscillator', detailUk: 'Стохастичний осцилятор порівнює ціну закриття з діапазоном цін. Значення вище 80 — перекупленість, нижче 20 — перепроданість.', detailEn: 'Stochastic compares closing price to price range. Above 80 overbought, below 20 oversold.', icon: '〰️' },
  { id: 'adx', nameUk: 'ADX', nameEn: 'ADX', shortDescUk: 'Індекс напрямку тренду', shortDescEn: 'Average Directional Index', detailUk: 'ADX вимірює силу тренду без вказівки напрямку. ADX > 25 вказує на сильний тренд, < 20 — на боковий рух.', detailEn: 'ADX measures trend strength. Above 25 strong trend, below 20 sideways.', icon: '💪' },
  { id: 'fractal', nameUk: 'Фрактал', nameEn: 'Fractal', shortDescUk: 'Патерн розвороту тренду', shortDescEn: 'Trend reversal pattern', detailUk: 'Фрактали — це патерни з п\'яти свічок, що вказують на локальні максимуми та мінімуми. Використовуються для визначення рівнів входу.', detailEn: 'Fractals are five-candle patterns indicating local highs and lows.', icon: '🔺' },
  { id: 'rsi', nameUk: 'RSI', nameEn: 'RSI', shortDescUk: 'Індекс відносної сили', shortDescEn: 'Relative Strength Index', detailUk: 'RSI вимірює швидкість зміни ціни. Нижче 30 — перепроданість (потенційний CALL), вище 70 — перекупленість (потенційний PUT).', detailEn: 'RSI measures price change speed. Below 30 oversold, above 70 overbought.', icon: '⚡' },
  { id: 'ema', nameUk: 'EMA', nameEn: 'EMA', shortDescUk: 'Експоненційна ковзна середня', shortDescEn: 'Exponential Moving Average', detailUk: 'EMA надає більшу вагу останнім цінам. Перетин EMA 21 та EMA 50 — класичний сигнал зміни тренду.', detailEn: 'EMA gives more weight to recent prices. EMA 21/50 crossover signals trend change.', icon: '📉' },
  { id: 'sr', nameUk: 'Підтримка / Опір', nameEn: 'Support / Resistance', shortDescUk: 'Ключові цінові рівні', shortDescEn: 'Key price levels', detailUk: 'Рівні підтримки та опору — зони, де ціна історично змінювала напрямок. Відскок від підтримки — CALL, від опору — PUT.', detailEn: 'Support and resistance are zones where price historically reversed direction.', icon: '🎯' },
  { id: 'volume', nameUk: 'Обсяг', nameEn: 'Volume', shortDescUk: 'Торговий обсяг', shortDescEn: 'Trading volume', detailUk: 'Обсяг підтверджує силу руху. Зростання ціни з високим обсягом — сильний сигнал. Низький обсяг — слабкий рух.', detailEn: 'Volume confirms move strength. Price rise with high volume is a strong signal.', icon: '📦' },
  { id: 'imbalance', nameUk: 'Імбаланс', nameEn: 'Imbalance', shortDescUk: 'Ціновий дисбаланс (FVG)', shortDescEn: 'Fair Value Gap', detailUk: 'Імбаланс (FVG) — зона, де ціна рухалась занадто швидко. Ринок часто повертається заповнити цю зону.', detailEn: 'Fair Value Gap is a zone where price moved too fast. Market often returns to fill it.', icon: '⚖️' },
];

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
  { id: 'l4', titleUk: 'Патерни', titleEn: 'Patterns', tab: 'basics', duration: '14 хв', contentUk: 'Графічні патерни допомагають передбачити рух ціни.\n\nРозворотні:\n• Голова і плечі\n• Подвійна вершина/дно\n• Молот / Повішений\n\nПродовження:\n• Прапор / Вимпел\n• Трикутник\n• Поглинання (Engulfing)\n\nПатерни працюють найкраще на старших таймфреймах з підтвердженням обсягом.', contentEn: 'Chart patterns help predict price movement.\n\nReversal: Head & Shoulders, Double Top/Bottom, Hammer\nContinuation: Flag, Pennant, Triangle, Engulfing', },
  { id: 'l5', titleUk: 'Імбаланс', titleEn: 'Imbalance', tab: 'basics', duration: '8 хв', contentUk: 'Імбаланс (Fair Value Gap) — це зона на графіку, де між свічками залишився "пробіл".\n\nЯк торгувати:\n1. Знайдіть FVG на графіку\n2. Дочекайтесь повернення ціни до зони\n3. Входьте в напрямку заповнення імбалансу\n\nFVG найефективніші на таймфреймах M5-M15.', contentEn: 'Fair Value Gap is a price gap between candles.\n\nHow to trade:\n1. Find FVG on chart\n2. Wait for price return\n3. Enter in fill direction', },
  { id: 'l6', titleUk: 'Підтримка', titleEn: 'Support', tab: 'basics', duration: '7 хв', contentUk: 'Підтримка — рівень, де ціна історично зупиняла падіння та розверталась вгору.\n\nЯк використовувати:\n• Шукайте відскок від підтримки для CALL\n• Чим більше разів ціна тестувала рівень — тим він сильніший\n• Пробій підтримки вниз — сигнал на PUT', contentEn: 'Support is a level where price historically stopped falling and reversed up.', },
  { id: 'l7', titleUk: 'Опір', titleEn: 'Resistance', tab: 'basics', duration: '7 хв', contentUk: 'Опір — рівень, де ціна історично зупиняла зростання та розверталась вниз.\n\nЯк використовувати:\n• Шукайте відхилення від опору для PUT\n• Пробій опору вгору — сигнал на CALL\n• Комбінуйте з індикаторами для підтвердження', contentEn: 'Resistance is a level where price historically stopped rising and reversed down.', },
  {
    id: 'l8',
    titleUk: 'Таймфрейми та експірація',
    titleEn: 'Timeframes & Expiration',
    tab: 'basics',
    duration: '11 хв',
    contentUk:
      'Для бінарних опціонів експірація — це час, коли угода закривається.\n\n' +
      'Короткі експірації (30с–1хв):\n• Швидкий результат, більше шуму\n• Потрібна чітка точка входу\n\n' +
      'Середні (3–5 хв):\n• Баланс між швидкістю та якістю сигналу\n• Підходять для більшості пар\n\n' +
      'Довгі (15хв+):\n• Менше хибних сплесків\n• Краще поєднувати з трендом старшого ТФ\n\n' +
      'Правило: не змінюйте експірацію посеред серії угод без причини.',
    contentEn: 'Expiration is when the trade closes. Short TF = fast but noisy; medium = balanced; long = smoother trends.',
  },
  {
    id: 'l9',
    titleUk: 'Мартингейл і перекриття',
    titleEn: 'Martingale & Recovery',
    tab: 'basics',
    duration: '9 хв',
    contentUk:
      'Мартингейл — збільшення ставки після програшу, щоб відіграти збиток однією виграшною угодою.\n\n' +
      'Ризики:\n• Серія програшів швидко з’їдає депозит\n• Психологічний тиск зростає\n\n' +
      'Якщо використовуєте перекриття:\n1. Обмежте кількість кроків (×2, ×4 — максимум)\n' +
      '2. Рахуйте загальний ризик серії заздалегідь\n3. Не торгуйте на емоціях після 2+ програшів підряд\n\n' +
      'Краще мати план ризику, ніж покладатися лише на мартингейл.',
    contentEn: 'Martingale increases stake after a loss. Limit steps, plan total risk, avoid emotional revenge trading.',
  },
  {
    id: 'l10',
    titleUk: 'Торговий журнал',
    titleEn: 'Trading Journal',
    tab: 'basics',
    duration: '8 хв',
    contentUk:
      'Журнал — найпростіший спосіб покращити результати.\n\n' +
      'Записуйте:\n• Пару та напрямок (CALL/PUT)\n• Час входу та експірацію\n• Причину входу (індикатор, рівень, новина)\n• Результат та емоційний стан\n\n' +
      'Раз на тиждень аналізуйте: які пари дають кращий win-rate, в який час ви торгуєте гірше, чи не завищуєте ставку після програшу.',
    contentEn: 'Log pair, direction, reason, result, emotions. Review weekly to find patterns.',
  },
  {
    id: 'b1',
    icon: '🧠',
    titleUk: 'Книга: «Зона трейдингу» (Марк Дуглас)',
    titleEn: 'Book: Trading in the Zone (Mark Douglas)',
    tab: 'books',
    duration: '45 хв',
    guideUrl: '/books/risk-management-guide.html',
    contentUk:
      'Класика психології трейдингу.\n\n' +
      'Головні ідеї:\n• Ринок — ймовірності, не гарантії\n• Страх і жадібність руйнують дисципліну\n' +
      '• Кожна угода статистично незалежна\n• Процес важливіший за одну угоду\n\n' +
      'Практика: перед сесією сформулюйте правила входу/виходу і дотримуйтесь їх незалежно від останнього результату.',
    contentEn: 'Classic trading psychology: probabilities, discipline, independent trades, process over outcome.',
  },
  {
    id: 'b2',
    icon: '📈',
    titleUk: 'Книга: «Технічний аналіз» (Джон Мерфі)',
    titleEn: 'Book: Technical Analysis (John Murphy)',
    tab: 'books',
    duration: '60 хв',
    guideUrl: '/books/technical-analysis-guide.html',
    contentUk:
      'Повний огляд технічного аналізу для початківців і практиків.\n\n' +
      'Теми: тренди, ковзні середні, обсяг, патерни, індикатори.\n' +
      'Корисно для розуміння, чому бот враховує RSI, MACD та рівні підтримки/опору.\n\n' +
      'Порада: не намагайтесь вивчити все одразу — почніть з тренду та рівнів S/R.',
    contentEn: 'Comprehensive TA reference: trends, MAs, volume, patterns, indicators.',
  },
  {
    id: 'b3',
    titleUk: 'Книга: «Навчання трейдингу» (Александр Елдер)',
    titleEn: 'Book: Come Into My Trading Room (Alexander Elder)',
    tab: 'books',
    duration: '50 хв',
    contentUk:
      'Три стовпи: психологія, аналіз, ризик-менеджмент.\n\n' +
      'Автор пропонує «три екрана»: старший ТФ для тренду, середній для сигналу, молодший для точного входу.\n' +
      'Для коротких експірацій адаптуйте ідею: спочатку напрямок тренду, потім точка входу на M1–M5.',
    contentEn: 'Psychology, analysis, risk. Triple screen method adapted for short expirations.',
  },
  {
    id: 'b4',
    titleUk: 'Книга: «Розумний інвестор» (Бенджамін Грем)',
    titleEn: 'Book: The Intelligent Investor (Benjamin Graham)',
    tab: 'books',
    duration: '55 хв',
    contentUk:
      'Хоча книга про інвестування, корисна для дисципліни та оцінки ризику.\n\n' +
      'Ідея margin of safety — не ризикуйте всім депозитом на одній угоді.\n' +
      'Для активного трейдингу: відокремте «торговий» капітал від особистих заощаджень.',
    contentEn: 'Investing classic; margin of safety and capital separation apply to active trading too.',
  },
  {
    id: 'b5',
    titleUk: 'Книга: «Криптовалюти» (Антонопулос)',
    titleEn: 'Book: Mastering Bitcoin (Andreas Antonopoulos)',
    tab: 'books',
    duration: '40 хв',
    contentUk:
      'Якщо торгуєте BTC/ETH та інші крипто-пари — зрозумійте базову механіку ринку.\n\n' +
      'Волатильність крипто вища за форекс: коротші експірації потребують жорсткішого ризик-менеджменту.\n' +
      'Слідкуйте за новинами: лістинги, регулювання, великі переміщення по гаманцях.',
    contentEn: 'Crypto market basics for traders on BTC/ETH pairs. Higher volatility = stricter risk rules.',
  },
  {
    id: 'b6',
    titleUk: 'Книга: «Японські свічки» (Стів Нісон)',
    titleEn: 'Book: Japanese Candlesticks (Steve Nison)',
    tab: 'books',
    duration: '48 хв',
    contentUk:
      'Свічковий аналіз — основа більшості графіків на платформах.\n\n' +
      'Ключові патерни: доджі, молот, поглинання, зірка вечірня/ранкова.\n' +
      'На експірації 1–5 хв шукайте підтвердження на 2–3 свічках, а не одній.',
    contentEn: 'Candlestick patterns: doji, hammer, engulfing. Confirm with 2–3 candles on short expirations.',
  },
];
