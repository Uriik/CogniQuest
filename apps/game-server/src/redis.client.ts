import Redis from 'ioredis';

/**
 * Cliente Redis ÚNICO compartilhado pelos gateways (lobby + game) no processo.
 * Antes cada gateway abria sua própria conexão; consolidar reduz a pressão no
 * limite de conexões do provedor (Upstash) sob autoscaling do Cloud Run.
 *
 * Nota: o adapter do Socket.io (main.ts) mantém suas próprias conexões pub/sub,
 * pois pub/sub não pode dividir a mesma conexão de comandos.
 */
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('error', (err) => console.error('Redis Error:', err.message));
