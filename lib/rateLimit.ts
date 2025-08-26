// lib/rateLimit.ts
const buckets = new Map<string, { count: number; ts: number }>();

type Options = {
  limit: number;    // max requests in the window
  windowMs: number; // window size in ms
};

export function rateLimit(
  key: string,
  { limit, windowMs }: Options
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(key);

  // new or expired bucket → reset
  if (!b || now - b.ts > windowMs) {
    buckets.set(key, { count: 1, ts: now });
    return { ok: true };
  }

  // still in window
  if (b.count < limit) {
    b.count += 1;
    return { ok: true };
  }

  const retryAfter = Math.ceil((windowMs - (now - b.ts)) / 1000);
  return { ok: false, retryAfter };
}
