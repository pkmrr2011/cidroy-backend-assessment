import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from './logger.js';

export const redisClient = createClient({
  url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
});

redisClient.on('error', (err) => logger.error(`❌ Redis Client Error: ${err.message}`));
redisClient.on('connect', () => logger.info('Connecting to Redis...'));
redisClient.on('ready', () => logger.info('✅ Redis Client Connected and Ready'));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
