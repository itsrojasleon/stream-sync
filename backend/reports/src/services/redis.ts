import { Redis } from 'ioredis';

export class RedisManager {
  static instance: Redis | null = null;

  private constructor() {}

  static async getInstance(): Promise<Redis> {
    if (!process.env.REDIS_HOSTNAME) {
      throw new Error('No Redis hostname found');
    }

    if (!RedisManager.instance) {
      console.log('Creating new Redis instance');
      // NOTE: When you create a new instance of the Redis class in ioredis,
      // it immediately starts attempting to connect to the Redis server using
      // the provided configuration. You don't need to call any additional
      // methods to initiate this connection.
      RedisManager.instance = new Redis({
        host: process.env.REDIS_HOSTNAME
      });

      RedisManager.instance.on('error', (err) => {
        console.error('Redis Client Error', err);
        RedisManager.instance = null; // Reset the instance on error
      });
    }

    return RedisManager.instance;
  }
}
