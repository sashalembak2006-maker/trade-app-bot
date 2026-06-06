/**
 * Minimal structured logger for the API.
 * Levels are gated by LOG_LEVEL (debug < info < warn < error). Default: info.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const THRESHOLD = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info;

function emit(level: Level, msg: string, meta?: unknown) {
  if (ORDER[level] < THRESHOLD) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) fn(`${prefix} ${msg}`, meta);
  else fn(`${prefix} ${msg}`);
}

export const log = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};

/** Express middleware: logs every request with method, path, status, duration. */
export function requestLogger(
  req: { method: string; originalUrl?: string; url: string },
  res: { statusCode: number; on: (ev: string, cb: () => void) => void },
  next: () => void,
) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const path = req.originalUrl ?? req.url;
    const level: Level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    emit(level, `${req.method} ${path} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
}
