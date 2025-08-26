// lib/limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("⚠️ Missing Upstash Redis env vars. Falling back to no rate limit (dev).");
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : undefined;

export const emailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      analytics: true,
    })
  : undefined;

/** Server-only helper (use inside API routes) */
export async function limitOrThrow(identifier: string) {
  if (!emailLimiter) return; // disabled when no Redis (local dev)
  const { success, reset } = await emailLimiter.limit(identifier);
  if (!success) {
    const retrySec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    const err = new Error(`Too many requests. Retry after ${retrySec}s`);
    // @ts-expect-error add a hint field for API routes
    (err as any).status = 429;
    throw err;
  }
}
