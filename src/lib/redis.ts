import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client — globally reused.
 * Falls back gracefully if env vars are missing (e.g. during build).
 */
function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const redis = createRedisClient();
