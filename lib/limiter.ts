// lib/limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("⚠️ Missing Upstash Redis env vars. Rate limiting will be disabled locally.");
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

// Email verification limiter (3 per 60s per identifier, e.g., email or IP)
export const emailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      analytics: true,
    })
  : undefined;

// Coach invite limiter (2 per 60s per identifier, e.g., inviter email or IP)
// export const inviteLimiter = redis
//   ? new Ratelimit({
//       redis,
//       limiter: Ratelimit.slidingWindow(2, "60 s"),
//       analytics: true,
//     })
//   : undefined;

export async function limitOrThrow(identifier: string, limiter = emailLimiter) {
  if (!limiter) return; // disabled when no Redis configured (e.g., local dev)

  const { success, reset } = await limiter.limit(identifier);
  if (!success) {
    const retrySec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    const err = new Error(`Too many requests. Retry after ${retrySec}s`);
    // annotate for API routes to map to HTTP 429
    (err as any).status = 429;
    throw err;
  }
}
