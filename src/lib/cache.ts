/**
 * Cache layer — Upstash Redis primary, in-memory fallback.
 *
 * - Redis: cross-instance, persistent, shared across cold starts
 * - In-memory: fallback when Redis is not configured, or during local dev
 */

import { redis } from "@/lib/redis";

// ─── In-memory fallback ────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memStore = new Map<string, CacheEntry<unknown>>();

let lastPrune = 0;
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, entry] of memStore) {
    if (entry.expiresAt <= now) memStore.delete(key);
  }
}

// ─── Redis helpers ─────────────────────────────────────────

async function redisGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSec });
  } catch {
    // Swallow — cache failure must not break the request
  }
}

async function redisDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Swallow
  }
}

async function redisScanDel(prefix: string): Promise<number> {
  if (!redis) return 0;
  try {
    // Use keys for simplicity — works fine for small key spaces (<10k)
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch {
    return 0;
  }
}

// ─── Public API ────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  // 1. Try Redis
  const redisVal = await redisGet<T>(key);
  if (redisVal !== null) return redisVal;

  // 2. Fallback to memory
  maybePrune();
  const entry = memStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const ttlSec = Math.ceil(ttlMs / 1000);

  // Write to both stores in parallel
  await Promise.all([
    redisSet(key, value, ttlSec),
    Promise.resolve().then(() => {
      memStore.set(key, { value, expiresAt: Date.now() + ttlMs });
    }),
  ]);
}

export async function cacheInvalidate(prefix: string): Promise<number> {
  // Invalidate both stores
  const [redisCount] = await Promise.all([
    redisScanDel(prefix),
    Promise.resolve().then(() => {
      let count = 0;
      for (const key of memStore.keys()) {
        if (key.startsWith(prefix)) {
          memStore.delete(key);
          count++;
        }
      }
      return count;
    }),
  ]);
  return redisCount;
}

/**
 * Best-effort stale read: return the cached value even if expired.
 * Used to serve the last-good snapshot when the live DB fetch fails.
 */
export async function cacheGetStale<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // ignore
    }
  }
  const entry = memStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry.value;
}

/**
 * Cache-aside helper: return cached value or call fn, cache the result, return it.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  await cacheSet(key, value, ttlMs);
  return value;
}

// ─── TTL presets ───────────────────────────────────────────

export const TTL = {
  /**
   * Jobs listing — aligned with the 5-min sync + 3-min auto-refresh so every
   * page load / refresh within a sync window is served from Redis, and only a
   * genuine new-sync boundary triggers a DB recompute. 3.5 min covers the
   * 3-min refresh without expiring mid-window.
   */
  JOBS_LIST: 210_000,
  /** Favorite job ids list (shared by every FavoriteButton on the page) */
  FAVORITES: 30_000,
  /** Filter facets (categories/subcategories/countries) — change only with sync */
  FACETS: 5 * 60_000,
  /** Market trends aggregations (7/30-day) — change only with the 5-min sync */
  TRENDS: 5 * 60_000,
  /** Dashboard stats */
  STATS: 30_000,
  /** Suggestions — typed infrequently */
  SUGGESTIONS: 5 * 60_000,
  /** Analytics — user-specific */
  ANALYTICS: 30_000,
  /** Single job detail */
  JOB_DETAIL: 20_000,
} as const;
