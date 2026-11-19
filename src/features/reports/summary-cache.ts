export type Summary = { amount_idr: string; count: number };
export type SummaryCache = Map<string, { expiresAt: number; request: Promise<Summary> }>;

// Owned by the account's provider, never a global cache of private finance data.
export function cachedSummary(cache: SummaryCache, key: string, load: () => Promise<Summary>) {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.request;
  const entry = { expiresAt: Date.now() + 60000, request: load() };
  cache.set(key, entry);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  void entry.request.catch(() => { if (cache.get(key) === entry) cache.delete(key); });
  return entry.request;
}
