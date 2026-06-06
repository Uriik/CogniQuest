import Redis from "ioredis";

/** Lazily-built singleton Redis client. */
let _redisClient: Redis | null = null;

export function getRedisClient(connectionUrl = process.env.REDIS_URL || "redis://localhost:6379") {
  if (!_redisClient) {
    _redisClient = new Redis(connectionUrl);
    _redisClient.on('error', (err) => console.error('Redis DB Error:', err.message));
  }
  return _redisClient;
}
