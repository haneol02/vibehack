import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL);
export const redisSub = new Redis(REDIS_URL);

redis.on('error', (err) => console.error('Redis error:', err));
redisSub.on('error', (err) => console.error('Redis sub error:', err));
