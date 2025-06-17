import { redis } from './redis';
import { User } from '@prisma/client';

const TOKEN_EXPIRATION = 60 * 60 * 2; // 2 hours in seconds

export async function setToken(token: string, user: User) {
  if (!redis) {
    console.warn('Redis not configured, token will not be stored');
    return;
  }
  const key = `token:${token}`;
  await redis.setex(key, TOKEN_EXPIRATION, JSON.stringify(user));
}

export async function verifyToken(token: string): Promise<User | null> {
  if (!redis) {
    console.warn('Redis not configured, token verification not available');
    return null;
  }
  const key = `token:${token}`;
  const data = await redis.get(key);
  if (data) {
    // Refresh the token expiration
    await redis.expire(key, TOKEN_EXPIRATION);
    return JSON.parse(data as string) as User;
  }
  return null;
} 