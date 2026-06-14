/** Signal lifecycle logs — always on (production diagnostics). */
export function logSignalEvent(
  event:
    | 'create_start'
    | 'create_ok'
    | 'create_fail'
    | 'countdown'
    | 'settle_start'
    | 'settle_ok'
    | 'settle_fail'
    | 'cover_start'
    | 'cover_ok',
  payload: Record<string, unknown>,
): void {
  const line = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  console.log('[PRIME Signal]', line);
}
