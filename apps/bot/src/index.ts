import 'dotenv/config';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Bot, InlineKeyboard, InputFile, type Context } from 'grammy';
import { syncUser, claimDeposit } from './api.js';
import { isAdmin, registerAdminHandlers } from './admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.BOT_TOKEN;
const botDisplayName = process.env.BOT_DISPLAY_NAME ?? 'PRIME TRADE BOT';
const webAppUrl =
  process.env.WEBAPP_URL ?? 'https://prime-trade-production.up.railway.app';
const pocketUrl = process.env.POCKET_REFERRAL_URL ?? 'https://pocketoption.com';
const depositUrl = process.env.DEPOSIT_URL ?? pocketUrl;
const supportUrl = process.env.SUPPORT_URL ?? 'https://t.me/primetradebot';
const reviewsUrl = process.env.REVIEWS_URL ?? 'https://t.me/primetradebot';
const requiredChannelId = process.env.REQUIRED_CHANNEL_ID ?? '';
const requiredChannelUrl = process.env.REQUIRED_CHANNEL_URL ?? '';
const welcomeImageUrl = process.env.WELCOME_IMAGE_URL ?? '';
const welcomeLocalPath = join(__dirname, '..', 'assets', 'welcome.png');
const adminIds = (process.env.TELEGRAM_ADMIN_IDS ?? process.env.ADMIN_TELEGRAM_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!token) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

function logBot(level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) fn(`[${ts}] [BOT:${level.toUpperCase()}] ${msg}`, meta);
  else fn(`[${ts}] [BOT:${level.toUpperCase()}] ${msg}`);
}

const bot = new Bot(token);

function hasAppAccess(user: { status: string; hasAppAccess?: boolean }): boolean {
  return (
    user.status === 'deposited' ||
    user.status === 'vip' ||
    (user.hasAppAccess ?? false)
  );
}

function hasLimitedAccess(user: { isBanned: boolean; isInvited?: boolean; status: string; hasAppAccess?: boolean }): boolean {
  if (user.isBanned) return false;
  return Boolean(user.isInvited) || hasAppAccess(user);
}

async function isChannelMember(ctx: Context, userId: number): Promise<boolean> {
  if (!requiredChannelId) return true;
  try {
    const member = await ctx.api.getChatMember(requiredChannelId, userId);
    return ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
  } catch (e) {
    logBot('warn', 'Channel membership check failed', e instanceof Error ? e.message : e);
    return false;
  }
}

function buildWelcomeCaption(): string {
  return (
    `Prime Trade | Bot\n` +
    `Алгоритмічна система аналізу фінансових ринків 📊\n\n` +
    `Інтелектуальний торговий бот нового покоління, що автоматично аналізує ринок і формує сигнали на основі статистичних моделей.\n\n` +
    `Використовує:\n` +
    `• 140+ індикаторів 📈\n` +
    `• Структуру ціни та ринкові патерни\n` +
    `• Алгоритмічний аналіз ліквідності\n\n` +
    `Ринки:\n` +
    `• 60+ валютних пар 💱\n` +
    `• Криптовалюти ₿\n` +
    `• Forex 🌍\n` +
    `• Метали та індекси 📊\n\n` +
    `Система:\n` +
    `• 24/7 автоматичний аналіз\n` +
    `• Сигнали входу/виходу\n` +
    `• Контроль ризику\n` +
    `• Дисципліна та точність\n\n` +
    `Prime Trade | Bot\n\n` +
    `Оберіть дію нижче:`
  );
}

function buildWelcomeKeyboard(showWebApp: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('📘 Інструкція', 'menu:instruction')
    .url('⭐ Відгуки ↗️', reviewsUrl)
    .row()
    .url('📲 Підтримка ↗️', supportUrl)
    .text('🌐 Змінити мову', 'menu:language')
    .row();

  if (showWebApp) {
    kb.webApp('🤖 Отримати сигнал 🤖', webAppUrl);
  }
  return kb;
}

const SERVICE_UNAVAILABLE_MSG =
  '⚠️ Сервіс тимчасово недоступний. Спробуйте /start через 30 сек.';

function subscribeKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (requiredChannelUrl) {
    kb.url('📢 Підписатися на канал', requiredChannelUrl).row();
  }
  kb.text('🔄 Перевірити підписку', 'menu:check_sub');
  return kb;
}

async function sendWelcomeMessage(ctx: Context, showWebApp: boolean) {
  const caption = buildWelcomeCaption();
  const reply_markup = buildWelcomeKeyboard(showWebApp);

  try {
    if (welcomeImageUrl) {
      await ctx.replyWithPhoto(welcomeImageUrl, { caption, reply_markup });
      return;
    }

    if (existsSync(welcomeLocalPath)) {
      await ctx.replyWithPhoto(new InputFile(welcomeLocalPath), { caption, reply_markup });
      return;
    }

    await ctx.reply(caption, { reply_markup });
  } catch (e) {
    logBot('warn', 'sendWelcomeMessage failed, falling back to text', e instanceof Error ? e.message : e);
    await ctx.reply(caption, { reply_markup }).catch(() => undefined);
  }
}

async function handleStart(ctx: Context) {
  const from = ctx.from;
  if (!from) return;

  try {
    const user = await syncUser(from.id, from);
    const isBotAdmin = isAdmin(String(from.id), adminIds);

    if (!user) {
      if (isBotAdmin) {
        await sendWelcomeMessage(ctx, true);
      } else {
        await ctx.reply(SERVICE_UNAVAILABLE_MSG);
      }
      return;
    }

    if (user.isBanned) {
      await ctx.reply(
        '⛔ *Доступ заблоковано*\n\nЗверніться до адміністратора.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const channelOk = await isChannelMember(ctx, from.id);
    if (requiredChannelId && !channelOk) {
      await ctx.reply(
        `📢 *Підпишіться на канал*\n\n` +
          `Для доступу до ${botDisplayName} потрібна підписка на наш канал.\n\n` +
          `Після підписки натисніть «Перевірити підписку».`,
        { parse_mode: 'Markdown', reply_markup: subscribeKeyboard() },
      );
      return;
    }

    const limited = isBotAdmin || hasLimitedAccess(user);
    if (!limited) {
      await ctx.reply(
        '🔒 Доступ закритий. Зверніться до адміністратора або очікуйте запрошення.',
        { reply_markup: buildWelcomeKeyboard(false) },
      );
      return;
    }

    const showWebApp = channelOk && limited;
    await sendWelcomeMessage(ctx, showWebApp);
  } catch (e) {
    logBot('error', 'handleStart failed', e instanceof Error ? { message: e.message, stack: e.stack } : e);
    await ctx.reply(SERVICE_UNAVAILABLE_MSG).catch(() => undefined);
  }
}

bot.command('start', handleStart);

bot.callbackQuery('menu:check_sub', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  try {
    const channelOk = await isChannelMember(ctx, from.id);
    if (!channelOk) {
      await ctx.answerCallbackQuery({
        text: '❌ Підписку не знайдено. Підпишіться на канал і спробуйте знову.',
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery();

    const user = await syncUser(from.id, from);
    const isBotAdmin = isAdmin(String(from.id), adminIds);

    if (!user) {
      if (isBotAdmin) {
        try {
          if (ctx.callbackQuery.message) {
            await ctx.deleteMessage().catch(() => undefined);
          }
        } catch {
          /* ignore */
        }
        await sendWelcomeMessage(ctx, true);
      } else {
        await ctx.reply(SERVICE_UNAVAILABLE_MSG);
      }
      return;
    }

    if (!isBotAdmin && !hasLimitedAccess(user)) {
      await ctx.editMessageText(
        '🔒 Доступ закритий. Зверніться до адміністратора або очікуйте запрошення.',
        { reply_markup: buildWelcomeKeyboard(false) },
      );
      return;
    }

    try {
      if (ctx.callbackQuery.message) {
        await ctx.deleteMessage().catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
    await sendWelcomeMessage(ctx, true);
  } catch (e) {
    logBot('error', 'menu:check_sub failed', e instanceof Error ? { message: e.message, stack: e.stack } : e);
    await ctx.answerCallbackQuery().catch(() => undefined);
    await ctx.reply(SERVICE_UNAVAILABLE_MSG).catch(() => undefined);
  }
});

bot.callbackQuery('menu:instruction', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `📘 *Інструкція*\n\n` +
      `1. Натисніть «🤖 Отримати сигнал 🤖» — відкрийте Mini App\n` +
      `2. Зареєструйтесь на Pocket Option (посилання в Mini App)\n` +
      `3. Поповніть депозит (мін. $${process.env.MIN_DEPOSIT_AMOUNT ?? 100})\n` +
      `4. Вкажіть Pocket Option ID у Mini App\n` +
      `5. Підтвердіть депозит — дочекайтесь адміна\n\n` +
      `⚠️ Сигнали є аналітичним прогнозом і не є фінансовою порадою.`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .url('📝 Реєстрація', pocketUrl)
        .row()
        .url('💳 Поповнити депозит', depositUrl),
    },
  );
});

bot.callbackQuery('menu:language', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    '🌐 *Мова / Language*\n\nОберіть мову інтерфейсу Mini App:',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🇺🇦 Українська', 'lang:uk')
        .text('🇬🇧 English', 'lang:en'),
    },
  );
});

bot.callbackQuery(/^lang:(uk|en)$/, async (ctx) => {
  const lang = ctx.match![1];
  await ctx.answerCallbackQuery({ text: lang === 'uk' ? '🇺🇦 Українська' : '🇬🇧 English' });
  await ctx.reply(
    lang === 'uk'
      ? '🇺🇦 Мову можна змінити в налаштуваннях Mini App.'
      : '🇬🇧 Change language in Mini App settings.',
  );
});

bot.hears('💰 Я поповнив депозит', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  try {
    const user = await syncUser(from.id, from);
    if (!user) {
      await ctx.reply(SERVICE_UNAVAILABLE_MSG);
      return;
    }
    if (user.isBanned) {
      await ctx.reply('⛔ Доступ заблоковано.');
      return;
    }
    if (!hasLimitedAccess(user)) {
      await ctx.reply('🔒 Доступ закритий. Зверніться до адміністратора.');
      return;
    }
    if (user.status === 'deposited' || user.status === 'vip') {
      await ctx.reply('✅ У вас уже є доступ!', {
        reply_markup: new InlineKeyboard().webApp('🤖 Отримати сигнал 🤖', webAppUrl),
      });
      return;
    }
    if (user.status === 'pending_deposit') {
      await ctx.reply('⏳ Заявка вже на розгляді. Дочекайтесь підтвердження адміністратора.');
      return;
    }

    await claimDeposit(from.id);
    await ctx.reply(
      '✅ *Заявку надіслано!*\n\nАдміністратор перевірить депозит і надасть доступ.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().webApp('📱 Відкрити Mini App', webAppUrl),
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Помилка';
    logBot('error', 'deposit handler failed', e instanceof Error ? { message: e.message, stack: e.stack } : e);
    if (msg.includes('NOT_REGISTERED') || msg.includes('platformAccountId')) {
      await ctx.reply(
        'Спочатку вкажіть Pocket Option ID у Mini App.',
        { reply_markup: new InlineKeyboard().webApp('📝 Зареєструватися', webAppUrl) },
      );
      return;
    }
    if (msg.includes('timed out')) {
      await ctx.reply(SERVICE_UNAVAILABLE_MSG);
      return;
    }
    await ctx.reply(`⚠️ ${msg}`).catch(() => undefined);
  }
});

registerAdminHandlers(bot, adminIds, (msg, meta) => logBot('info', msg, meta));

bot.catch((err) => {
  const { ctx, error } = err;
  logBot('error', 'Bot runtime error', {
    updateId: ctx.update.update_id,
    updateType: Object.keys(ctx.update).find((k) => k !== 'update_id'),
    chatId: ctx.chat?.id,
    userId: ctx.from?.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
});

bot.start({
  onStart: (info) =>
    logBot('info', `${botDisplayName} @${info.username} started (admins: ${adminIds.length})`),
});
