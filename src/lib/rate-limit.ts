/**
 * Rate limit in-memory por chave (SPEC §6.5) — suficiente para Vercel:
 * cada instância serverless limita a própria janela.
 */
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= maxRequests) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}
