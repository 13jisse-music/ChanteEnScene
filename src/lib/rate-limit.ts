/**
 * Simple in-memory rate limiter.
 * Tracks requests by key (e.g., IP address) with a sliding window.
 */

const rateMap = new Map<string, number[]>()

interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
}

export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetMs: number } {
  const { windowMs = 60_000, maxRequests = 5 } = options
  const now = Date.now()

  // Get or create timestamps array for this key
  const timestamps = rateMap.get(key) || []

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < windowMs)

  if (valid.length >= maxRequests) {
    rateMap.set(key, valid)
    const oldestValid = valid[0]
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestValid + windowMs - now,
    }
  }

  valid.push(now)
  rateMap.set(key, valid)

  return {
    allowed: true,
    remaining: maxRequests - valid.length,
    resetMs: windowMs,
  }
}

// Cleanup old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, timestamps] of rateMap.entries()) {
      const valid = timestamps.filter((t) => now - t < 300_000) // 5 min max window
      if (valid.length === 0) {
        rateMap.delete(key)
      } else {
        rateMap.set(key, valid)
      }
    }
  }, 300_000)
}
