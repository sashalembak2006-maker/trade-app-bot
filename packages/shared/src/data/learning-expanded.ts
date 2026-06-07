import type { LearningArticle } from '../types/index.js';

/** Expanded basics + books (l4–l10, b1–b6). */
export const LEARNING_EXPANDED: LearningArticle[] = [
  {
    id: 'l4',
    icon: '🔷',
    titleUk: 'Патерни',
    titleEn: 'Patterns',
    tab: 'basics',
    duration: '16 хв',
    guideUrl: '/books/technical-analysis-guide.html',
    contentUk:
      'Графічні патерни — «мова» ринку. Бот враховує структуру свічок при генерації сигналу.\n\n' +
      '━━━ Розворотні ━━━\n' +
      '• Голова і плечі — три вершини, середня найвища → PUT після лінії шиї\n' +
      '• Подвійна вершина — дві вершини на одному рівні → PUT\n' +
      '• Подвійне дно — дві западини → CALL\n' +
      '• Молот / Повішений — довга тінь, маленьке тіло\n\n' +
      '━━━ Продовження ━━━\n' +
      '• Прапор / Вимпел — пауза в тренді → вхід на пробої\n' +
      '• Трикутник — стискання волатильності → пробій у напрямку тренду\n' +
      '• Поглинання (Engulfing) — велика свічка поглинає попередню\n\n' +
      '━━━ Крипто приклад ━━━\n' +
      'BTC: після імпульсу вгору «прапор» на M5 → CALL на пробої вгору, експ. 2–3 хв.\n\n' +
      'Патерни надійніші на M5+ з підтвердженням обсягом.',
    contentEn: 'Reversal and continuation patterns. Confirm with volume on M5+.',
  },
  {
    id: 'l5',
    icon: '⚖️',
    titleUk: 'Імбаланс (FVG)',
    titleEn: 'Imbalance (FVG)',
    tab: 'basics',
    duration: '12 хв',
    contentUk:
      'Fair Value Gap — «пробіл» у цінах через швидкий імпульс.\n\n' +
      '━━━ Як виглядає ━━━\n' +
      '  Свічка 1    Свічка 2 (імпульс)    Свічка 3\n' +
      '     │            ████                 │\n' +
      '     │            ████    ← gap       │\n' +
      '     └────────────┴───────────────────┘\n\n' +
      '━━━ Алгоритм ━━━\n' +
      '1. Знайдіть FVG на M5 або M15\n' +
      '2. Дочекайтесь повернення ціни в зону (50–100% заповнення)\n' +
      '3. Вхід у напрямку заповнення\n' +
      '4. Експірація 2–5 хв\n\n' +
      '━━━ Помилка ━━━\n' +
      'Не входьте в середину сильного імпульсу — чекайте відкат.',
    contentEn: 'FVG fill strategy: wait for price to return to the gap zone.',
  },
  {
    id: 'l6',
    icon: '🟢',
    titleUk: 'Підтримка',
    titleEn: 'Support',
    tab: 'basics',
    duration: '11 хв',
    contentUk:
      'Підтримка — рівень, де покупці раніше зупиняли падіння.\n\n' +
      '━━━ Як знайти ━━━\n' +
      '• Мінімуми, де ціна 2+ рази відскочила\n' +
      '• Горизонтальна лінія на графіку\n' +
      '• Кластер свічок з довгими нижніми тінями\n\n' +
      '━━━ Торгівля ━━━\n' +
      '✅ Відскок + RSI < 40 → CALL\n' +
      '✅ Пробій вниз + ретест зверху → PUT\n' +
      '❌ Ножі — не ловіть падаючий ніж без підтвердження\n\n' +
      '━━━ Приклад GOLD ━━━\n' +
      'XAU $2340 тестував рівень 3 рази → сильна підтримка для CALL на відскок.',
    contentEn: 'Support bounces for CALL; breakdown and retest for PUT.',
  },
  {
    id: 'l7',
    icon: '🔴',
    titleUk: 'Опір',
    titleEn: 'Resistance',
    tab: 'basics',
    duration: '11 хв',
    contentUk:
      'Опір — стеля, де продавці зупиняли зростання.\n\n' +
      '━━━ Ознаки сильного опору ━━━\n' +
      '• 3+ дотики до рівня\n' +
      '• Великі верхні тіні (відхилення)\n' +
      '• Збіг з круглим числом (1.1000 EUR/USD)\n\n' +
      '━━━ Торгівля ━━━\n' +
      '✅ Відхилення від опору + RSI > 60 → PUT\n' +
      '✅ Пробій вгору + закріплення → CALL на ретесті\n\n' +
      '━━━ Новини ━━━\n' +
      'Під час NFP опір може пробиватись миттєво — не торгуйте за 5 хв до новини.',
    contentEn: 'Resistance rejections for PUT; breakout and retest for CALL.',
  },
  {
    id: 'l8',
    icon: '⏱️',
    titleUk: 'Таймфрейми та експірація',
    titleEn: 'Timeframes & Expiration',
    tab: 'basics',
    duration: '14 хв',
    contentUk:
      'Експірація = коли закривається угода. Це головний параметр у бінарних опціонах.\n\n' +
      '━━━ Короткі (30с – 1хв) ━━━\n' +
      '• Швидкий результат\n' +
      '• Багато ринкового шуму\n' +
      '• Потрібна ідеальна точка входу\n' +
      '• Краще для OTC у спокійний час\n\n' +
      '━━━ Середні (2 – 5 хв) ━━━\n' +
      '• Оптимум для більшості пар\n' +
      '• Час для розвитку імпульсу\n' +
      '• Рекомендація бота для початківців\n\n' +
      '━━━ Довгі (15хв+) ━━━\n' +
      '• Менше хибних сплесків\n' +
      '• Поєднуйте з трендом H1\n\n' +
      '━━━ Правило ━━━\n' +
      'Оберіть 1–2 експірації і дотримуйтесь їх у журналі. Не змінюйте посеред серії.',
    contentEn: 'Match expiration to pair volatility. Medium 2–5m is best for beginners.',
  },
  {
    id: 'l9',
    icon: '🎲',
    titleUk: 'Мартингейл і перекриття',
    titleEn: 'Martingale & Recovery',
    tab: 'basics',
    duration: '13 хв',
    guideUrl: '/books/risk-management-guide.html',
    contentUk:
      'Мартингейл — подвоєння ставки після програшу.\n\n' +
      '━━━ Математика ━━━\n' +
      '$10 → програш → $20 → програш → $40 → програш = -$70 за 3 угоди\n' +
      'Один виграш $40 не покриває серію.\n\n' +
      '━━━ Якщо використовуєте ━━━\n' +
      '• Макс. 2 кроки (×2, ×4)\n' +
      '• Рахуйте макс. збиток серії ЗАЗДАЛЕГІДЬ\n' +
      '• Стоп після 2 програшів підряд без мартингейлу\n\n' +
      '━━━ Краща альтернатива ━━━\n' +
      'Фіксована ставка 1–2% + журнал + пауза після 3 програшів.',
    contentEn: 'Martingale is risky. Max 2 steps or use fixed 1–2% risk.',
  },
  {
    id: 'l10',
    icon: '📓',
    titleUk: 'Торговий журнал',
    titleEn: 'Trading Journal',
    tab: 'basics',
    duration: '12 хв',
    contentUk:
      'Журнал перетворює хаос на систему.\n\n' +
      '━━━ Що записувати ━━━\n' +
      '• Дата, час, пара (EUR/USD OTC)\n' +
      '• CALL / PUT, експірація (1m, 3m)\n' +
      '• Причина: RSI, рівень, патерн, сигнал бота\n' +
      '• Entry / Exit, результат (+/-)\n' +
      '• Емоції: спокій / FOMO / злість\n\n' +
      '━━━ Щотижневий аналіз ━━━\n' +
      '• Win-rate по парах\n' +
      '• Найгірший час доби\n' +
      '• Чи росте ставка після програшу?\n\n' +
      '━━━ Шаблон ━━━\n' +
      'Google Таблиці або блокнот — головне регулярність.',
    contentEn: 'Log every trade with reason and emotion. Review weekly.',
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
      'Класика психології трейдингу. Рекомендовано кожному перед реальною торгівлею.\n\n' +
      '━━━ Головні ідеї ━━━\n' +
      '• Ринок — ймовірності, не гарантії\n' +
      '• Страх і жадібність руйнують дисципліну\n' +
      '• Кожна угода статистично незалежна\n' +
      '• Процес важливіший за одну угоду\n\n' +
      '━━━ Практика ━━━\n' +
      'Перед сесією: 3 правила входу + макс. збиток дня. Дотримуйтесь незалежно від останнього результату.\n\n' +
      '━━━ Звʼязок з ботом ━━━\n' +
      'Сигнал бота — лише інструмент. Рішення про ставку і ризик — за вами.\n\n' +
      '📥 PDF-конспект доступний кнопкою нижче.',
    contentEn: 'Trading psychology classic. Process over single trade outcome.',
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
      'Повний огляд технічного аналізу — «біблія» для трейдерів.\n\n' +
      '━━━ Теми ━━━\n' +
      '• Тренди та фази ринку\n' +
      '• Ковзні середні, обсяг\n' +
      '• Патерни, індикатори, міжринковий аналіз\n\n' +
      '━━━ Для Mini App ━━━\n' +
      'Розділи про RSI, MACD та S/R пояснюють логіку індикаторів у боті.\n\n' +
      '━━━ План навчання ━━━\n' +
      'Тиждень 1: тренд + S/R\n' +
      'Тиждень 2: індикатори\n' +
      'Тиждень 3: патерни\n\n' +
      '📥 Відкрийте PDF-гайд з графіками.',
    contentEn: 'Comprehensive TA bible. Study trend, S/R, then indicators.',
  },
  {
    id: 'b3',
    icon: '🖥️',
    titleUk: 'Книга: «Навчання трейдингу» (Александр Елдер)',
    titleEn: 'Book: Come Into My Trading Room (Alexander Elder)',
    tab: 'books',
    duration: '50 хв',
    guideUrl: '/books/technical-analysis-guide.html',
    contentUk:
      'Три стовпи успіху: психологія, аналіз, ризик-менеджмент.\n\n' +
      '━━━ Три екрани Елдера ━━━\n' +
      'Екран 1 (H1/D1) — напрямок тренду (EMA)\n' +
      'Екран 2 (M15) — сигнал (MACD / Stochastic)\n' +
      'Екран 3 (M5/M1) — точний вхід\n\n' +
      '━━━ Адаптація для бінарних опціонів ━━━\n' +
      '1. Визначте тренд на старшому ТФ\n' +
      '2. Відкрийте Mini App на потрібній парі\n' +
      '3. Сигнал бота + підтвердження індикатором\n' +
      '4. Експірація 1–5 хв за силою імпульсу\n\n' +
      '━━━ Психологія ━━━\n' +
      'Правило 6%: не ризикуйте більше 6% депозиту на місяць сумарно.',
    contentEn: 'Elder triple screen adapted for short binary expirations.',
  },
  {
    id: 'b4',
    icon: '💎',
    titleUk: 'Книга: «Розумний інвестор» (Бенджамін Грем)',
    titleEn: 'Book: The Intelligent Investor (Benjamin Graham)',
    tab: 'books',
    duration: '55 хв',
    guideUrl: '/books/risk-management-guide.html',
    contentUk:
      'Класика інвестування — корисна для дисципліни активного трейдера.\n\n' +
      '━━━ Margin of Safety ━━━\n' +
      '«Запас міцності» — не ризикуйте всім на одній угоді.\n' +
      'У бінарних опціонах: макс. 1–2% на угоду.\n\n' +
      '━━━ Розділення капіталу ━━━\n' +
      '• Торговий рахунок — тільки для угод\n' +
      '• Резерв — не чіпати\n' +
      '• Особисті заощадження — окремо\n\n' +
      '━━━ Емоції ━━━\n' +
      'Mr. Market — метафора: ринок пропонує ціни, ви вирішуєте приймати чи ні.',
    contentEn: 'Margin of safety and capital separation for active traders.',
  },
  {
    id: 'b5',
    icon: '₿',
    titleUk: 'Книга: «Криптовалюти» (Антонопулос)',
    titleEn: 'Book: Mastering Bitcoin (Andreas Antonopoulos)',
    tab: 'books',
    duration: '40 хв',
    guideUrl: '/books/technical-analysis-guide.html',
    contentUk:
      'Для тих, хто торгує BTC, ETH та інші крипто-пари.\n\n' +
      '━━━ Чому важливо ━━━\n' +
      'Крипто рухається 24/7, реагує на новини миттєво, волатильність у 3–5× вища за форекс.\n\n' +
      '━━━ Графік BTC ━━━\n' +
      '  $68k ──╮\n' +
      '        │ імпульс на новині ETF\n' +
      '  $66k ─●── корекція 3% за 15 хв\n\n' +
      '━━━ Правила ━━━\n' +
      '• Ставка 1% max на крипто\n' +
      '• Експірація 2–5 хв (не 30с)\n' +
      '• Уникайте торгівлі під час великих анонсів\n\n' +
      '━━━ Події ━━━\n' +
      'Лістинги, халвінг, регулювання — стрибки обсягу і ціни.',
    contentEn: 'Crypto volatility rules: 1% risk, 2–5m expiration, avoid news spikes.',
  },
  {
    id: 'b6',
    icon: '🕯️',
    titleUk: 'Книга: «Японські свічки» (Стів Нісон)',
    titleEn: 'Book: Japanese Candlesticks (Steve Nison)',
    tab: 'books',
    duration: '48 хв',
    guideUrl: '/books/technical-analysis-guide.html',
    contentUk:
      'Свічковий аналіз — основа графіків Pocket Option і нашого бота.\n\n' +
      '━━━ Ключові патерни ━━━\n' +
      '• Доджі — нерішучість, можливий розворот\n' +
      '• Молот — довга нижня тінь → CALL біля підтримки\n' +
      '• Поглинання — велика свічка поглинає попередню\n' +
      '• Зірка вечірня / ранкова — розворот тренду\n\n' +
      '━━━ На експірації 1–5 хв ━━━\n' +
      'Потрібно 2–3 свічки підтвердження, не одна.\n\n' +
      '━━━ Приклад ━━━\n' +
      'EUR/USD: молот на підтримці + зелена свічка після → CALL 2 хв.\n\n' +
      '📥 Графічний гайд у PDF.',
    contentEn: 'Candlestick patterns for short expirations. Confirm with 2–3 candles.',
  },
  {
    id: 'l11',
    icon: '🎯',
    titleUk: 'Основи Pocket Option',
    titleEn: 'Pocket Option Basics',
    tab: 'basics',
    duration: '10 хв',
    contentUk:
      'Pocket Option — платформа для бінарних опціонів з фіксованою експірацією.\n\n' +
      '━━━ Інтерфейс ━━━\n' +
      '• Графік + актив зліва\n' +
      '• Сума ставки + CALL/PUT\n' +
      '• Експірація (30с – 4 год)\n' +
      '• Payout % біля пари\n\n' +
      '━━━ Demo ━━━\n' +
      'Починайте з demo-quick-high-low. Prime Trade Bridge читає ціни з цієї вкладки.\n\n' +
      '━━━ Порада ━━━\n' +
      'Оберіть 2–3 пари і вивчіть їх поведінку перед live.',
    contentEn: 'Pocket Option UI basics. Start on demo, learn 2–3 pairs first.',
  },
  {
    id: 'l12',
    icon: '⚡',
    titleUk: 'Як працюють бінарні опціони',
    titleEn: 'How Binary Options Work',
    tab: 'basics',
    duration: '12 хв',
    contentUk:
      'Бінарна опція — прогноз напрямку ціни до моменту експірації.\n\n' +
      '━━━ CALL / PUT ━━━\n' +
      'CALL — ціна вища за вхід → виграш\n' +
      'PUT — ціна нижча → виграш\n\n' +
      '━━━ Payout ━━━\n' +
      'Ставка $10, payout 92% → прибуток ~$9.20\n\n' +
      '━━━ Ризик ━━━\n' +
      'При програші втрачаєте всю ставку. Тому 1–2% від депозиту на угоду.',
    contentEn: 'Binary options: predict direction by expiry. Fixed payout, fixed risk.',
  },
  {
    id: 'l13',
    icon: '🌙',
    titleUk: 'Що таке OTC',
    titleEn: 'What is OTC',
    tab: 'basics',
    duration: '8 хв',
    contentUk:
      'OTC (Over-The-Counter) — пари, що торгуються поза основною біржею, часто 24/7.\n\n' +
      '━━━ Особливості ━━━\n' +
      '• Вища волатильність\n' +
      '• Payout часто 90%+\n' +
      '• Ціни від брокера, не міжбанк\n\n' +
      '━━━ Prime Trade ━━━\n' +
      'Bridge зчитує OTC ціни з Pocket Option — те саме, що бачите на платформі.\n\n' +
      '━━━ Ризик ━━━\n' +
      'Коротша експірація (1–3 хв) на OTC часто стабільніша ніж 30с.',
    contentEn: 'OTC pairs trade 24/7 with broker quotes. Higher volatility, often higher payout.',
  },
  {
    id: 'l14',
    icon: '📈',
    titleUk: 'Тренди',
    titleEn: 'Trends',
    tab: 'basics',
    duration: '11 хв',
    contentUk:
      'Тренд — домінуючий напрямок ціни.\n\n' +
      '━━━ Види ━━━\n' +
      '• Висхідний — Higher Highs / Higher Lows\n' +
      '• Нисхідний — Lower Highs / Lower Lows\n' +
      '• Флет — боковик\n\n' +
      '━━━ Правило ━━━\n' +
      'Торгуйте за трендом, не проти.\n\n' +
      '━━━ Приклад ━━━\n' +
      'EUR/USD H1 вгору → на M1 шукайте CALL на відкатах.',
    contentEn: 'Trade with the trend. Uptrend = CALL bias on pullbacks.',
  },
  {
    id: 'l15',
    icon: '🧠',
    titleUk: 'Психологія трейдингу',
    titleEn: 'Trading Psychology',
    tab: 'basics',
    duration: '14 хв',
    contentUk:
      'Емоції — головний ворог трейдера.\n\n' +
      '━━━ Типові помилки ━━━\n' +
      '• Revenge trading після програшу\n' +
      '• FOMO — вхід без сигналу\n' +
      '• Overtrading — 50 угод на день\n\n' +
      '━━━ Антидот ━━━\n' +
      'План, журнал, ліміт 5–10 угод/день.\n\n' +
      '━━━ Перекриття ━━━\n' +
      'Максимум 2 перекриття по боту — потім пауза.',
    contentEn: 'Control emotions. Journal trades, limit daily count, respect max 2 coverages.',
  },
  {
    id: 'l16',
    icon: '⚠️',
    titleUk: 'Типові помилки новачків',
    titleEn: 'Beginner Mistakes',
    tab: 'basics',
    duration: '10 хв',
    contentUk:
      '━━━ Топ-7 помилок ━━━\n' +
      '1. Ставка >5% депозиту\n' +
      '2. Торгівля без сигналу\n' +
      '3. 30с експірація на новинах\n' +
      '4. Ігнор payout <60%\n' +
      '5. Мартингейл без ліміту\n' +
      '6. 10+ пар одночасно\n' +
      '7. Немає demo-практики\n\n' +
      '━━━ Рішення ━━━\n' +
      'Prime Trade Bot дає структурований сигнал + перекриття max ×2.',
    contentEn: 'Avoid oversizing, overtrading, and unlimited martingale.',
  },
];
