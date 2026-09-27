import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL;
const redisPassword = process.env.REDIS_PASSWORD;

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Required by BullMQ
  ...(redisPassword ? { password: redisPassword } : {}),
  ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
};

/**
 * Parse a Redis URL string into a proper RedisOptions object.
 *
 * WHY: BullMQ requires maxRetriesPerRequest:null and enableReadyCheck:false.
 * Passing a raw URL string to BullMQ creates an internal ioredis connection
 * WITHOUT these options, causing emailQueue.addBulk() to hang for minutes
 * when the Upstash TLS connection resets after being idle.
 */
function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const isTls = parsed.protocol === 'rediss:';
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || (isTls ? 6380 : 6379),
    username: parsed.username || 'default',
    password: decodeURIComponent(parsed.password),
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
    ...(isTls ? { tls: {} } : {}),
  };
}

// Always a proper options object - NEVER a raw URL string.
// BullMQ (emailQueue) uses this and requires maxRetriesPerRequest: null.
export const redisConnectionOptions: RedisOptions = redisUrl
  ? parseRedisUrl(redisUrl)
  : {
      host: config.redisHost,
      port: config.redisPort,
      ...baseOptions,
    };

// Separate client used for health checks and direct Redis operations
export const redisClient = redisUrl
  ? new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
  : new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info(`Redis connected successfully (${redisUrl ? 'REDIS_URL' : `${config.redisHost}:${config.redisPort}`})`);
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const ping = await redisClient.ping();
    return ping === 'PONG';
  } catch (err) {
    logger.error('Redis health check failed:', err);
    return false;
  }
}
