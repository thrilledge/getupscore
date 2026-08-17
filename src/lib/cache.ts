/**
 * Lightweight in-memory cache with TTL.
 *
 * Works within a single Vercel serverless function instance. Multiple
 * requests that hit the same warm instance share the cache, cutting
 * redundant DB calls. When the function cold-starts, the cache is empty
 * and repopulates naturally.
 *
 * For cross-instance caching, swap get/set with Redis/Upstash later.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

// Periodically prune expired entries (max once per 60s)
let lastPrune = 0;
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

export function cacheGet<T>(key: string): T | null {
  maybePrune();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(prefix: string): number {
  let count = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Cache-aside helper: return cached value or call fn, cache the result, return it.
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

// TTL presets
export const TTL = {
  /** Jobs listing — refreshed often but not on every 30s poll */
  JOBS_LIST: 15_000,
  /** Dashboard stats — polled every 60s by frontend */
  STATS: 30_000,
  /** Suggestions — typed infrequently, data changes slowly */
  SUGGESTIONS: 5 * 60_000,
  /** Analytics — user-specific, short TTL */
  ANALYTICS: 30_000,
  /** Single job detail */
  JOB_DETAIL: 20_000,
} as const;
