/** TELEGRAM_ADMIN_IDS is the canonical name; ADMIN_TELEGRAM_IDS kept for backward compatibility. */
export function getAdminTelegramIds(): string[] {
  const raw = process.env.TELEGRAM_ADMIN_IDS ?? process.env.ADMIN_TELEGRAM_IDS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
