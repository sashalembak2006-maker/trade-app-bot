/** Bridge POST auth — supports Railway BRIDGE_SECRET + extension secret (comma-separated BRIDGE_SECRETS). */
export function getConfiguredBridgeSecrets(): string[] {
  const out = new Set<string>();
  const multi = process.env.BRIDGE_SECRETS?.split(',') ?? [];
  for (const s of multi) {
    const t = s.trim();
    if (t) out.add(t);
  }
  const single = process.env.BRIDGE_SECRET?.trim();
  if (single) out.add(single);
  return [...out];
}

export function isBridgeSecretValid(header: string | string[] | undefined): boolean {
  const provided = typeof header === 'string' ? header.trim() : '';
  if (!provided) return false;
  const allowed = getConfiguredBridgeSecrets();
  return allowed.length > 0 && allowed.includes(provided);
}

export function isBridgeSecretConfigured(): boolean {
  return getConfiguredBridgeSecrets().length > 0;
}
