/**
 * Lightweight frontend logger. Always logs warn/error; debug/info only in dev
 * or when VITE_DEBUG_LOGS=true. Keeps production console clean but keeps
 * critical signal/ws/api diagnostics visible.
 */
const VERBOSE = import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true';

function stamp(scope: string) {
  return `%c[PRIME ${scope}]`;
}
const STYLE = 'color:#d4af37;font-weight:bold';

export const logger = {
  debug: (scope: string, ...args: unknown[]) => {
    if (VERBOSE) console.debug(stamp(scope), STYLE, ...args);
  },
  info: (scope: string, ...args: unknown[]) => {
    if (VERBOSE) console.log(stamp(scope), STYLE, ...args);
  },
  warn: (scope: string, ...args: unknown[]) => console.warn(stamp(scope), STYLE, ...args),
  error: (scope: string, ...args: unknown[]) => console.error(stamp(scope), STYLE, ...args),
};
