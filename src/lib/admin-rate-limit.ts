import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export interface AdminRateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  source: 'upstash' | 'memory'
}

export class InMemorySlidingWindowRateLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  async limitIdentifier(identifier: string, now = Date.now()): Promise<AdminRateLimitResult> {
    const windowStart = now - this.windowMs
    const existingAttempts = (this.attempts.get(identifier) ?? []).filter((attempt) => attempt > windowStart)

    if (existingAttempts.length >= this.limit) {
      const reset = existingAttempts[0] + this.windowMs
      this.attempts.set(identifier, existingAttempts)
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset,
        source: 'memory',
      }
    }

    existingAttempts.push(now)
    this.attempts.set(identifier, existingAttempts)

    return {
      success: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - existingAttempts.length),
      reset: now + this.windowMs,
      source: 'memory',
    }
  }
}

const fallbackRateLimiter = new InMemorySlidingWindowRateLimiter(5, 15 * 60 * 1000)

let upstashRateLimiter: Ratelimit | null | undefined

function getUpstashRateLimiter(): Ratelimit | null {
  if (upstashRateLimiter !== undefined) {
    return upstashRateLimiter
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    upstashRateLimiter = null
    return upstashRateLimiter
  }

  const redis = new Redis({ url, token })
  upstashRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'chatroom:admin-login',
    analytics: false,
  })

  return upstashRateLimiter
}

export async function limitAdminLogin(identifier: string, now = Date.now()): Promise<AdminRateLimitResult> {
  const rateLimiter = getUpstashRateLimiter()
  if (!rateLimiter) {
    return fallbackRateLimiter.limitIdentifier(identifier, now)
  }

  const result = await rateLimiter.limit(identifier)
  await result.pending

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    source: 'upstash',
  }
}
