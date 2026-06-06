import { getAdminTelegramIds } from '../utils/admin-ids.js';

const BOT_TOKEN = process.env.BOT_TOKEN;

export async function notifyAdminsDepositRequest(data: {
  username?: string | null;
  telegramId: string;
  platformAccountId?: string | null;
  amount?: number;
  requestId: string;
}) {
  const adminIds = getAdminTelegramIds();
  if (!BOT_TOKEN || adminIds.length === 0) return;

  const text =
    `🆕 *Новий депозит-запит*\n\n` +
    `👤 @${data.username ?? 'unknown'}\n` +
    `🆔 Telegram ID: \`${data.telegramId}\`\n` +
    `📋 Platform ID: \`${data.platformAccountId ?? '—'}\`\n` +
    `💰 Сума: $${data.amount ?? 0}\n` +
    `📌 Request: \`${data.requestId}\``;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💰 Підтвердити депозит', callback_data: `approve_basic:${data.requestId}` },
        { text: '⭐ VIP', callback_data: `approve_vip:${data.requestId}` },
      ],
      [{ text: '❌ Reject', callback_data: `reject:${data.requestId}` }],
    ],
  };

  for (const chatId of adminIds) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }),
      });
    } catch { /* ignore */ }
  }
}
