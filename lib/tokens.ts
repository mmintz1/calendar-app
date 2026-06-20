import { Redis } from '@upstash/redis';

/**
 * Persistence for the owner's Google refresh token.
 *
 * A refresh token is long-lived and lets the backend mint fresh access tokens
 * indefinitely, so it must outlive any single serverless invocation. We store
 * it in Upstash Redis (the store behind Vercel's Marketplace Redis integration)
 * rather than the (ephemeral, read-only) serverless filesystem.
 *
 * Single-owner app → a single fixed key. To support multiple owners later,
 * key by owner id/email instead.
 */
const REFRESH_TOKEN_KEY = 'google:owner:refresh_token';

/**
 * Build the Redis client lazily so a missing config only fails the request that
 * needs storage, not the whole app at import time. Accepts either the native
 * Upstash env names or the `KV_*` names that Vercel's integration injects.
 */
let client: Redis | null = null;
function redis(): Redis {
  if (client) return client;

  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Redis is not configured. Set UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN).'
    );
  }

  client = new Redis({ url, token });
  return client;
}

export async function saveRefreshToken(token: string): Promise<void> {
  await redis().set(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return redis().get<string>(REFRESH_TOKEN_KEY);
}

export async function clearRefreshToken(): Promise<void> {
  await redis().del(REFRESH_TOKEN_KEY);
}

export async function isConnected(): Promise<boolean> {
  return (await getRefreshToken()) !== null;
}
