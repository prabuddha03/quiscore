import { Redis } from '@upstash/redis'

// Check if the required environment variables are present.
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize the redis client only if the config is available.
export const redis = hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

if (!hasRedisConfig) {
  console.warn(
    "⚠️ Upstash Redis environment variables not found. The application will run without Redis caching. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production use."
  );
} 