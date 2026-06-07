/**
 * Sliding-window rate limiter over a minimal KV store (Redis in prod, fake in
 * tests). Counts events per key within `windowSeconds`; rejects above `max`.
 *
 * Uses INCR + EXPIRE semantics. Inject any store implementing `KvStore`.
 */
export interface KvStore {
  /** Increment integer at key; returns the new value. */
  incr(key: string): Promise<number>;
  /** Set TTL (seconds) on key if not already set. */
  expire(key: string, seconds: number): Promise<void>;
  /** Seconds remaining on key TTL, or -1 if none. */
  ttl(key: string): Promise<number>;
}

export interface RateLimitRule {
  max: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Common rules — tune in production. */
export const RATE_RULES = {
  login: { max: 5, windowSeconds: 60 },
  register: { max: 3, windowSeconds: 60 },
  createRoom: { max: 10, windowSeconds: 60 },
  answer: { max: 30, windowSeconds: 10 },
  renameRoom: { max: 5, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export async function checkRateLimit(
  store: KvStore,
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const count = await store.incr(key);
  if (count === 1) {
    await store.expire(key, rule.windowSeconds);
  }
  const allowed = count <= rule.max;
  const ttl = await store.ttl(key);
  return {
    allowed,
    remaining: Math.max(0, rule.max - count),
    retryAfterSeconds: allowed ? 0 : Math.max(1, ttl),
  };
}

/** Build a namespaced key, e.g. rateKey("login", ip). */
export const rateKey = (rule: string, identifier: string) =>
  `ratelimit:${rule}:${identifier}`;
