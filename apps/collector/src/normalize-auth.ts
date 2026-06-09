/**
 * Pocket Option sends auth in different shapes from cabinet vs demo chart.
 * Collector expects: 42["auth",{"session":"...","isDemo":1,"uid":...}]
 */
export function normalizePoAuthMessage(raw: string): string {
  const m = raw.trim();
  const prefix = '42["auth",';
  if (!m.startsWith(prefix)) return m;

  const start = m.indexOf('{');
  const end = m.lastIndexOf('}');
  if (start < 0 || end <= start) return m;

  try {
    const obj = JSON.parse(m.slice(start, end + 1)) as Record<string, unknown>;
    const session =
      (typeof obj.session === 'string' && obj.session) ||
      (typeof obj.sessionToken === 'string' && obj.sessionToken) ||
      (typeof obj.token === 'string' && obj.token) ||
      null;
    if (!session) return m;

    const isDemo =
      obj.isDemo === 1 ||
      obj.isDemo === true ||
      obj.isDemo === '1' ||
      String(obj.currentUrl ?? '').includes('demo') ||
      obj.isChart === 1;

    const normalized: Record<string, unknown> = {
      ...obj,
      session,
      isDemo: isDemo ? 1 : 0,
    };
    delete normalized.sessionToken;
    delete normalized.token;

    return `${prefix}${JSON.stringify(normalized)}]`;
  } catch {
    return m;
  }
}
