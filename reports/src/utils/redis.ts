import { RedisManager } from '@/services/redis';

const keyUserPrefix = 'user:';

const getUserKey = (id: number) => `${keyUserPrefix}${id}`;

export const setCachedUser = async (
  userId: number,
  data: Record<string, any>
) => {
  const redis = await RedisManager.getInstance();

  const key = getUserKey(userId);
  await redis.set(key, JSON.stringify(data), 'EX', 3600); // Set expiration as needed.
};

export const getCachedUser = async (userId: number) => {
  const redis = await RedisManager.getInstance();

  const key = getUserKey(userId);
  const cachedUser = await redis.get(key);
  return cachedUser ? JSON.parse(cachedUser) : null;
};
