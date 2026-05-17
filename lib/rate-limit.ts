import { NextResponse } from "next/server";

interface RateLimitStore {
  tokens: number;
  lastRefill: number;
}

const activeLimiters = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  limit: number;      // Maximum tokens allowed (capacity)
  intervalMs: number; // Time window in milliseconds (e.g. 60000 for 1 minute)
}

/**
 * IP-based Token Bucket Rate Limiter
 * Returns null if allowed, or an HTTP 429 NextResponse if rate limited.
 */
export function rateLimit(
  ip: string,
  key: string,
  options: RateLimitOptions = { limit: 10, intervalMs: 60000 }
) {
  const compositeKey = `${key}:${ip}`;
  const now = Date.now();
  const store = activeLimiters.get(compositeKey);

  // Initial token fill
  if (!store) {
    activeLimiters.set(compositeKey, {
      tokens: options.limit - 1,
      lastRefill: now,
    });
    return null;
  }

  // Refill tokens based on time elapsed
  const elapsed = now - store.lastRefill;
  const tokensToAdd = Math.floor(elapsed / (options.intervalMs / options.limit));
  
  if (tokensToAdd > 0) {
    store.tokens = Math.min(options.limit, store.tokens + tokensToAdd);
    store.lastRefill = now;
  }

  // Check capacity and decrement
  if (store.tokens <= 0) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((options.intervalMs - elapsed) / 1000).toString(),
        },
      }
    );
  }

  store.tokens -= 1;
  activeLimiters.set(compositeKey, store);
  return null;
}
