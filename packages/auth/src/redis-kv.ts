import type { KvStore } from "./rate-limit.js";

export class RedisKvStore implements KvStore {
  constructor(private redis: any) {}

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    // Check if TTL is already set, if not, set it
    const ttl = await this.redis.ttl(key);
    if (ttl < 0) {
      await this.redis.expire(key, seconds);
    }
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }
}
