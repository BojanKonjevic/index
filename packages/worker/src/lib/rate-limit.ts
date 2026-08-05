import { createMiddleware } from "hono/factory"
import { AppError } from "./error"

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface Entry {
  count: number
  resetAt: number
}

let lastCleanup = 0

export function rateLimit(config: RateLimitConfig) {
  const stores = new Map<string, Entry>()

  return createMiddleware(async (c, next) => {
    const now = Date.now()

    if (now - lastCleanup > 60_000) {
      lastCleanup = now
      for (const [key, entry] of stores) {
        if (entry.resetAt <= now) stores.delete(key)
      }
    }

    const ip = c.req.header("cf-connecting-ip") || "unknown"
    const key = `${ip}:${c.req.path}`

    let entry = stores.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + config.windowMs }
      stores.set(key, entry)
    }

    entry.count++

    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header("Retry-After", String(retryAfter))
      throw new AppError(429, "error.rate_limited")
    }

    await next()
  })
}
