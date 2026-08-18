/**
 * Rate limiting using Upstash Redis.
 * Falls back to allowing all requests if Redis is not configured.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

function createRatelimit(windowMs: number, max: number) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    analytics: false,
  });
}

/** Auth endpoints: 10 requests per minute per IP */
export const authRateLimit = createRatelimit(60_000, 10);

/** AI analysis: 20 requests per minute per user */
export const analysisRateLimit = createRatelimit(60_000, 20);

/** Proposal generation: 10 requests per minute per user */
export const proposalRateLimit = createRatelimit(60_000, 10);

/** General API: 60 requests per minute per IP */
export const apiRateLimit = createRatelimit(60_000, 60);

/**
 * Helper: check rate limit, return { success, remaining, reset }.
 * Returns { success: true } if Redis is not configured (no-op).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!limiter) return { success: true, remaining: 999, reset: 0 };
  return limiter.limit(identifier);
}
