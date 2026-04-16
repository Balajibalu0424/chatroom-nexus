import assert from 'node:assert/strict'
import test from 'node:test'

import { InMemorySlidingWindowRateLimiter } from '@/lib/admin-rate-limit'

test('in-memory rate limiter blocks after the configured threshold', async () => {
  const limiter = new InMemorySlidingWindowRateLimiter(5, 15 * 60 * 1000)
  const start = 1_710_000_000_000

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await limiter.limitIdentifier('127.0.0.1', start + attempt * 1000)
    assert.equal(result.success, true)
  }

  const blocked = await limiter.limitIdentifier('127.0.0.1', start + 6_000)
  assert.equal(blocked.success, false)
  assert.equal(blocked.remaining, 0)

  const recovered = await limiter.limitIdentifier('127.0.0.1', start + 15 * 60 * 1000 + 1)
  assert.equal(recovered.success, true)
})
