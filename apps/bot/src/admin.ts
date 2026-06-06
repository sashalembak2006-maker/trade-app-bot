import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { apiCall, inviteUser } from './api.js';

type UserRow = {
  telegramId: string;
  firstName?: string;
  username?: string;
  status: string;
  isInvited?: boolean;
  platformAccountId?: string;
  signalCount?: number;
};

type DepositRow = {
  id: string;
  amount: number;
  user: UserRow;
};

type Analytics = {
  totalUsers: number;
  withAccess: number;
  vip: number;
  pendingDeposits: number;
  pendingDepositUsers: number;
  totalSignals: number;
  invited?: number;
  pendingInvite?: number;
};

const pendingBroadcast = new Set<string>();
const pendingSearch = new Set<string>();
const pendingGrant = new Map<string, 'basic' | 'vip' | 'revoke' | 'ban' | 'invite' | 'registered'>();

export function isAdmin(telegramId: string, adminIds: string[]): boolean {
  return adminIds.includes(telegramId);
}

function adminMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📩 Розсилка', 'adm:broadcast')
    .text('👥 Реферали', 'adm:referrals')
    .row()
    .text('➕ Додати реферала', 'adm:invite')
    .text('💰 Депозити', 'adm:deposits')
    .row()
    .text('✅ Видати доступ', 'adm:grant')
    .text('👑 VIP', 'adm:grantvip')
    .row()
    .text('📝 Реєстрація', 'adm:grant_reg')
    .text('❌ Забрати', 'adm:revoke')
    .row()
    .text('🚫 Бан', 'adm:ban')
    .text('📊 Статистика', 'adm:stats')
    .row()
    .text('🔍 Пошук', 'adm:search')
    .text('🔄 Оновити', 'adm:menu');
}

export async function showAdminMenu(ctx: Context) {
  await ctx.reply(
    '👑 *TRADE APP BOT — Адмін*\n\n' +
      'Оберіть дію або використайте команди:\n' +
      '`/grant <telegramId>` — basic доступ\n' +
      '`/grantvip <telegramId>` — VIP\n' +
      '`/revoke <telegramId>` — забрати доступ\n' +
      '`/ban <telegramId>` — бан\n' +
      '`/unban <telegramId>` — розбан',
    { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() },
  );
}

export function registerAdminHandlers(bot: Bot, adminIds: string[], log: (msg: string, meta?: unknown) => void) {
  bot.command('admin', async (ctx) => {
    const id = String(ctx.from?.id ?? '');
    if (!isAdmin(id, adminIds)) {
      await ctx.reply('⛔ Доступ лише для адміністраторів.');
      return;
    }
    await showAdminMenu(ctx);
  });

  bot.command('grant', async (ctx) => {
    if (!isAdmin(String(ctx.from?.id ?? ''), adminIds)) return;
    const tgId = ctx.match?.trim();
    if (!tgId || !/^\d+$/.test(tgId)) {
      await ctx.reply('Використання: /grant <telegramId>');
      return;
    }
    try {
      await apiCall(`/users/${tgId}/grant`, 'POST', { level: 'basic' }, String(ctx.from?.id));
      await ctx.reply(`✅ Basic доступ видано: ${tgId}`);
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
    }
  });

  bot.command('grantvip', async (ctx) => {
    if (!isAdmin(String(ctx.from?.id ?? ''), adminIds)) return;
    const tgId = ctx.match?.trim();
    if (!tgId || !/^\d+$/.test(tgId)) {
      await ctx.reply('Використання: /grantvip <telegramId>');
      return;
    }
    try {
      await apiCall(`/users/${tgId}/grant`, 'POST', { level: 'vip' }, String(ctx.from?.id));
      await ctx.reply(`⭐ VIP видано: ${tgId}`);
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
    }
  });

  bot.command('revoke', async (ctx) => {
    if (!isAdmin(String(ctx.from?.id ?? ''), adminIds)) return;
    const tgId = ctx.match?.trim();
    if (!tgId || !/^\d+$/.test(tgId)) {
      await ctx.reply('Використання: /revoke <telegramId>');
      return;
    }
    try {
      await apiCall(`/users/${tgId}/grant`, 'POST', { level: 'revoke' }, String(ctx.from?.id));
      await ctx.reply(`🚫 Доступ забрано: ${tgId}`);
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
    }
  });

  bot.command('ban', async (ctx) => {
    if (!isAdmin(String(ctx.from?.id ?? ''), adminIds)) return;
    const tgId = ctx.match?.trim();
    if (!tgId || !/^\d+$/.test(tgId)) {
      await ctx.reply('Використання: /ban <telegramId>');
      return;
    }
    try {
      await apiCall(`/users/${tgId}/ban`, 'POST', {}, String(ctx.from?.id));
      await ctx.reply(`⛔ Забанено: ${tgId}`);
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
    }
  });

  bot.command('unban', async (ctx) => {
    if (!isAdmin(String(ctx.from?.id ?? ''), adminIds)) return;
    const tgId = ctx.match?.trim();
    if (!tgId || !/^\d+$/.test(tgId)) {
      await ctx.reply('Використання: /unban <telegramId>');
      return;
    }
    try {
      await apiCall(`/users/${tgId}/unban`, 'POST', {}, String(ctx.from?.id));
      await ctx.reply(`✅ Розбанено: ${tgId}`);
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
    }
  });

  bot.on('message:text', async (ctx, next) => {
    const id = String(ctx.from?.id ?? '');
    if (!isAdmin(id, adminIds)) return next();

    if (pendingGrant.has(id) && !ctx.message.text.startsWith('/')) {
      const action = pendingGrant.get(id)!;
      pendingGrant.delete(id);
      const query = ctx.message.text.trim();
      if (!/^\d+$/.test(query)) {
        await ctx.reply('Введіть числовий Telegram ID.');
        return;
      }
      try {
        if (action === 'ban') {
          await apiCall(`/users/${query}/ban`, 'POST', {}, id);
          await ctx.reply(`⛔ Забанено: ${query}`);
        } else if (action === 'invite') {
          await inviteUser(query, id);
          await ctx.reply(`➕ Реферала додано (whitelist): ${query}`);
        } else {
          const level =
            action === 'vip'
              ? 'vip'
              : action === 'revoke'
                ? 'revoke'
                : action === 'registered'
                  ? 'registered'
                  : 'basic';
          await apiCall(`/users/${query}/grant`, 'POST', { level }, id);
          const label =
            level === 'vip'
              ? '⭐ VIP'
              : level === 'revoke'
                ? '🚫 Доступ забрано'
                : level === 'registered'
                  ? '📝 Реєстрація дозволена'
                  : '✅ Basic доступ';
          await ctx.reply(`${label}: ${query}`);
        }
      } catch (e) {
        await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
      }
      return;
    }

    if (pendingSearch.has(id) && !ctx.message.text.startsWith('/')) {
      pendingSearch.delete(id);
      const query = ctx.message.text.trim();
      try {
        const users = await apiCall<UserRow[]>(`/users?search=${encodeURIComponent(query)}&limit=10`, 'GET');
        if (users.length === 0) {
          await ctx.reply('Користувачів не знайдено.');
          return;
        }
        const lines = users.map(
          (u, i) =>
            `${i + 1}. ${u.firstName ?? '—'} @${u.username ?? '—'}\n` +
            `   ID: \`${u.telegramId}\` | ${u.status}${u.isInvited ? ' | invited' : ''}\n` +
            `   PO: ${u.platformAccountId ?? '—'}`,
        );
        await ctx.reply(`🔍 *Результати:*\n\n${lines.join('\n\n')}`, {
          parse_mode: 'Markdown',
          reply_markup: adminMenuKeyboard(),
        });
      } catch (e) {
        await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка'}`);
      }
      return;
    }

    if (!pendingBroadcast.has(id)) return next();
    if (ctx.message.text.startsWith('/')) {
      pendingBroadcast.delete(id);
      return next();
    }

    pendingBroadcast.delete(id);
    const text = ctx.message.text;
    await ctx.reply('📤 Розсилка запущена…');

    try {
      const targets = await apiCall<{ count: number; telegramIds: string[] }>(
        '/broadcast-targets?mode=active',
        'GET',
      );
      let sent = 0;
      let failed = 0;
      for (const chatId of targets.telegramIds) {
        try {
          await ctx.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
          sent++;
        } catch {
          failed++;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      await ctx.reply(`✅ Розсилка завершена: ${sent} доставлено, ${failed} помилок (з ${targets.count})`);
      log('Broadcast sent', { sent, failed, total: targets.count });
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка розсилки'}`);
    }
  });

  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    const fromId = String(ctx.from?.id ?? '');

    const depositMatch = /^(approve_basic|approve_vip|reject):(.+)$/.exec(data);
    if (depositMatch) {
      if (!isAdmin(fromId, adminIds)) {
        await ctx.answerCallbackQuery({ text: '⛔ Лише для адміністраторів', show_alert: true });
        return;
      }
      const [, action, requestId] = depositMatch;
      try {
        const path =
          action === 'reject'
            ? `/deposit-requests/${requestId}/reject`
            : action === 'approve_vip'
              ? `/deposit-requests/${requestId}/approve-vip`
              : `/deposit-requests/${requestId}/approve`;
        await apiCall(path, 'POST', {}, fromId);
        const label =
          action === 'reject' ? '❌ Відхилено' : action === 'approve_vip' ? '⭐ VIP видано' : '💰 Депозит підтверджено';
        await ctx.answerCallbackQuery({ text: label });
        await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
      } catch (e) {
        await ctx.answerCallbackQuery({ text: '⚠️ Помилка', show_alert: true });
        log('Deposit callback failed', e instanceof Error ? e.message : e);
      }
      return;
    }

    if (!data.startsWith('adm:')) return next();
    if (!isAdmin(fromId, adminIds)) {
      await ctx.answerCallbackQuery({ text: '⛔ Лише для адміністраторів', show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();

    try {
      if (data === 'adm:menu') {
        await ctx.editMessageText(
          '👑 *TRADE APP BOT — Адмін*\n\nОберіть дію або використайте команди /grant /ban',
          { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() },
        );
        return;
      }

      if (data === 'adm:referrals') {
        const users = await apiCall<UserRow[]>('/users?invited=true&limit=20', 'GET');
        const lines = users.map(
          (u, i) =>
            `${i + 1}. ${u.firstName ?? '—'} @${u.username ?? '—'}\n` +
            `   ID: \`${u.telegramId}\` | ${u.status}\n` +
            `   PO: ${u.platformAccountId ?? '—'}`,
        );
        await ctx.editMessageText(
          `👥 *Реферали (запрошені, без депозиту)* — ${users.length}\n\n${lines.join('\n\n') || 'Порожньо'}`,
          { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() },
        );
        return;
      }

      if (data === 'adm:invite') {
        pendingGrant.set(fromId, 'invite');
        await ctx.reply('➕ Введіть Telegram ID для додавання до whitelist (реферал):');
        return;
      }

      if (data === 'adm:grant_reg') {
        pendingGrant.set(fromId, 'registered');
        await ctx.reply('📝 Введіть Telegram ID для дозволу реєстрації в Mini App:');
        return;
      }

      if (data === 'adm:users') {
        const users = await apiCall<UserRow[]>('/users?limit=15', 'GET');
        const lines = users.map(
          (u, i) =>
            `${i + 1}. ${u.firstName ?? '—'} @${u.username ?? '—'}\n` +
            `   ID: \`${u.telegramId}\` | ${u.status}${u.isInvited ? ' | invited' : ''}\n` +
            `   PO: ${u.platformAccountId ?? '—'} | signals: ${u.signalCount ?? 0}`,
        );
        await ctx.editMessageText(
          `👥 *Останні 15 користувачів*\n\n${lines.join('\n\n') || 'Порожньо'}`,
          { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() },
        );
        return;
      }

      if (data === 'adm:deposits') {
        const deps = await apiCall<DepositRow[]>('/deposit-requests?status=pending', 'GET');
        if (deps.length === 0) {
          await ctx.editMessageText('💰 Немає очікуючих депозитів.', { reply_markup: adminMenuKeyboard() });
          return;
        }
        const dep = deps[0];
        const kb = new InlineKeyboard()
          .text('💰 Підтвердити депозит', `approve_basic:${dep.id}`)
          .text('⭐ VIP', `approve_vip:${dep.id}`)
          .row()
          .text('❌ Відхилити', `reject:${dep.id}`)
          .row()
          .text('« Меню', 'adm:menu');
        await ctx.editMessageText(
          `💰 *Депозит (${deps.length} в черзі)*\n\n` +
            `👤 ${dep.user.firstName} @${dep.user.username ?? '—'}\n` +
            `🆔 TG: \`${dep.user.telegramId}\`\n` +
            `📋 PO ID: \`${dep.user.platformAccountId ?? '—'}\`\n` +
            `💵 $${dep.amount}`,
          { parse_mode: 'Markdown', reply_markup: kb },
        );
        return;
      }

      if (data === 'adm:stats') {
        const s = await apiCall<Analytics>('/analytics', 'GET');
        await ctx.editMessageText(
          `📊 *Статистика*\n\n` +
            `👥 Всього: ${s.totalUsers}\n` +
            `✅ З доступом: ${s.withAccess}\n` +
            `⭐ VIP: ${s.vip}\n` +
            `📨 Запрошені: ${s.invited ?? 0}\n` +
            `⏳ Очікують (invite): ${s.pendingInvite ?? 0}\n` +
            `⏳ Депозити (запити): ${s.pendingDeposits}\n` +
            `⏳ Очікують (users): ${s.pendingDepositUsers}\n` +
            `📈 Сигналів: ${s.totalSignals}`,
          { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() },
        );
        return;
      }

      if (data === 'adm:broadcast') {
        pendingBroadcast.add(fromId);
        await ctx.reply(
          '📢 *Розсилка*\n\nНадішліть наступним повідомленням текст для всіх активних користувачів.\nСкасувати: /admin',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (data === 'adm:search') {
        pendingSearch.add(fromId);
        await ctx.reply('🔍 Введіть Telegram ID або @username для пошуку:');
        return;
      }

      if (data === 'adm:grant') {
        pendingGrant.set(fromId, 'basic');
        await ctx.reply('✅ Введіть Telegram ID для видачі basic доступу:');
        return;
      }

      if (data === 'adm:grantvip') {
        pendingGrant.set(fromId, 'vip');
        await ctx.reply('👑 Введіть Telegram ID для видачі VIP:');
        return;
      }

      if (data === 'adm:revoke') {
        pendingGrant.set(fromId, 'revoke');
        await ctx.reply('❌ Введіть Telegram ID для відкликання доступу:');
        return;
      }

      if (data === 'adm:ban') {
        pendingGrant.set(fromId, 'ban');
        await ctx.reply('🚫 Введіть Telegram ID для бану:');
        return;
      }
    } catch (e) {
      await ctx.reply(`⚠️ ${e instanceof Error ? e.message : 'Помилка API'}`);
    }
  });
}
