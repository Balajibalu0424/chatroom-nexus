import assert from 'node:assert/strict'
import test from 'node:test'
import { webcrypto } from 'node:crypto'

import {
  generateTotpCode,
  hashAdminPassword,
  verifyAdminPassword,
  verifyTotpCode,
} from '@/lib/admin-auth'
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/admin-session'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

test('admin password hashes verify correctly', () => {
  const hash = hashAdminPassword('correct horse battery staple', {
    salt: Buffer.alloc(16, 7),
  })

  assert.equal(verifyAdminPassword('correct horse battery staple', hash), true)
  assert.equal(verifyAdminPassword('wrong password', hash), false)
})

test('totp codes verify within the allowed window', () => {
  const secret = 'JBSWY3DPEHPK3PXP'
  const now = 1_710_000_000_000
  const code = generateTotpCode(secret, now)

  assert.equal(verifyTotpCode(secret, code, now), true)
  assert.equal(verifyTotpCode(secret, code, now + 25_000), true)
  assert.equal(verifyTotpCode(secret, code, now + 120_000), false)
})

test('admin session tokens reject tampering and expiry', async () => {
  const token = await createAdminSessionToken('ops-admin', 'session-secret', 1_710_000_000_000, 60)
  const parsed = await verifyAdminSessionToken(token, 'session-secret', 1_710_000_020_000)

  assert.deepEqual(parsed, {
    username: 'ops-admin',
    issuedAt: 1_710_000_000_000,
    expiresAt: 1_710_000_060_000,
  })

  const tampered = `${token}tampered`
  assert.equal(await verifyAdminSessionToken(tampered, 'session-secret', 1_710_000_020_000), null)
  assert.equal(await verifyAdminSessionToken(token, 'session-secret', 1_710_000_120_000), null)
})
