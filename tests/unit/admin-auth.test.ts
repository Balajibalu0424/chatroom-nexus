import assert from 'node:assert/strict'
import test from 'node:test'
import { webcrypto } from 'node:crypto'

import {
  getAdminAuthConfig,
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

const originalAdminEnv = {
  username: process.env.ADMIN_USERNAME,
  passwordHash: process.env.ADMIN_PASSWORD_SCRYPT,
  passwordHashBase64: process.env.ADMIN_PASSWORD_SCRYPT_BASE64,
  totpSecret: process.env.ADMIN_TOTP_SECRET,
  sessionSecret: process.env.ADMIN_SESSION_SECRET,
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

test.afterEach(() => {
  restoreEnv('ADMIN_USERNAME', originalAdminEnv.username)
  restoreEnv('ADMIN_PASSWORD_SCRYPT', originalAdminEnv.passwordHash)
  restoreEnv('ADMIN_PASSWORD_SCRYPT_BASE64', originalAdminEnv.passwordHashBase64)
  restoreEnv('ADMIN_TOTP_SECRET', originalAdminEnv.totpSecret)
  restoreEnv('ADMIN_SESSION_SECRET', originalAdminEnv.sessionSecret)
})

test('admin password hashes verify correctly', () => {
  const hash = hashAdminPassword('correct horse battery staple', {
    salt: Buffer.alloc(16, 7),
  })

  assert.equal(verifyAdminPassword('correct horse battery staple', hash), true)
  assert.equal(verifyAdminPassword('wrong password', hash), false)
})

test('admin auth config accepts a base64 encoded password hash', () => {
  const hash = hashAdminPassword('correct horse battery staple', {
    salt: Buffer.alloc(16, 7),
  })

  process.env.ADMIN_USERNAME = 'ops-admin'
  delete process.env.ADMIN_PASSWORD_SCRYPT
  process.env.ADMIN_PASSWORD_SCRYPT_BASE64 = Buffer.from(hash).toString('base64')
  process.env.ADMIN_TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
  process.env.ADMIN_SESSION_SECRET = 'session-secret'

  assert.equal(getAdminAuthConfig().passwordHash, hash)
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
