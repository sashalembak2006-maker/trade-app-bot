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
  { id: 'l1', titleUk: 'Основи трейдингу', titleEn: 'Trading Basics', tab: 'basics', duration: '10 хв', contentUk: 'Трейдинг — це купівля та продаж фінансових інструментів з метою отримання прибутку від зміни ціни.\n\nОсновні поняття:\n• Актив — інструмент для торгівлі (валюта, крипто, акція)\n• Експірація — час закінчення угоди\n• CALL — прогноз на зростання ціни\n• PUT — прогноз на падіння ціни\n• Payout — відсоток прибутку при правильному прогнозі\n\nПеред початком торгівлі важливо вивчити основи, розробити стратегію та навчитися управляти ризиками.', contentEn: 'Trading is buying and selling financial instruments to profit from price changes.\n\nKey concepts:\n• Asset — instrument to trade\n• Expiration — trade end time\n• CALL — price will go up\n• PUT — price will go down\n• Payout — profit percentage', },
  { id: 'l2', titleUk: 'Ризик-менеджмент', titleEn: 'Risk Management', tab: 'basics', duration: '12 хв', contentUk: 'Ризик-менеджмент — найважливіша частина успішного трейдингу.\n\nПравила:\n1. Ризикуйте не більше 1-2% депозиту на угоду\n2. Використовуйте стоп-лосс (обмеження збитків)\n3. Не збільшуйте ставку після програшу (revenge trading)\n4. Ведіть торговий журнал\n5. Визначте максимальну денну просадку\n\nПам\'ятайте: збереження капіталу важливіше за швидкий прибуток.', contentEn: 'Risk management is the most important part of successful trading.\n\nRules:\n1. Risk max 1-2% per trade\n2. Use stop-loss\n3. No revenge trading\n4. Keep a trading journal\n5. Set max daily drawdown', },
  { id: 'l3', titleUk: 'Основи аналізу', titleEn: 'Analysis Basics', tab: 'basics', duration: '15 хв', contentUk: 'Існує два типи аналізу:\n\nТехнічний аналіз:\n• Вивчення графіків та патернів\n• Індикатори (RSI, MACD, MA)\n• Рівні підтримки та опору\n\nФундаментальний аналіз:\n• Економічні новини\n• Звіти центробанків\n• Макроекономічні дані\n\nДля короткострокової торгівлі найбільш ефективний технічний аналіз.', contentEn: 'Two types of analysis:\n\nTechnical: charts, patterns, indicators\nFundamental: news, central bank reports, macro data', },
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
    titleUk: 'Книга: «Зона трейдингу» (Марк Дуглас)',
    titleEn: 'Book: Trading in the Zone (Mark Douglas)',
    tab: 'books',
    duration: '45 хв',
    contentUk:
      'Класика психології трейдингу.\n\n' +
      'Головні ідеї:\n• Ринок — ймовірності, не гарантії\n• Страх і жадібність руйнують дисципліну\n' +
      '• Кожна угода статистично незалежна\n• Процес важливіший за одну угоду\n\n' +
      'Практика: перед сесією сформулюйте правила входу/виходу і дотримуйтесь їх незалежно від останнього результату.',
    contentEn: 'Classic trading psychology: probabilities, discipline, independent trades, process over outcome.',
  },
  {
    id: 'b2',
    titleUk: 'Книга: «Технічний аналіз» (Джон Мерфі)',
    titleEn: 'Book: Technical Analysis (John Murphy)',
    tab: 'books',
    duration: '60 хв',
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
