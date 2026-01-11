import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only create Redis client if environment variables are set
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Default rate limiter for public endpoints (5 requests per minute per IP)
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "cardtool",
    })
  : null;

// Stricter rate limiter for feedback submissions (3 per hour per user)
export const feedbackRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "feedback",
    })
  : null;

// Rate limiter for invite code verification (10 per hour per IP)
export const inviteCodeRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: true,
      prefix: "invite",
    })
  : null;

// Rate limiter for points import (60 per minute per user - for Tampermonkey scripts)
export const pointsImportRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "points-import",
    })
  : null;

// Helper function to check rate limit with fallback
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!limiter) {
    // If rate limiting is not configured, allow the request
    return { success: true };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
  };
}

