import assert from 'node:assert/strict'
import test from 'node:test'
import { webcrypto } from 'node:crypto'

import { NextRequest } from 'next/server'

import {
  buildAdminSessionCookie,
  generateTotpCode,
  hashAdminPassword,
  issueAdminSession,
} from '@/lib/admin-auth'
import { GET as listDevices } from '@/app/api/admin/devices/route'
import { POST as loginRoute } from '@/app/api/admin/login/route'
import { middleware } from '../../middleware'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

function configureAdminEnv() {
  process.env.ADMIN_USERNAME = 'ops-admin'
  process.env.ADMIN_PASSWORD_SCRYPT = hashAdminPassword('very-strong-password', {
    salt: Buffer.alloc(16, 11),
  })
  process.env.ADMIN_TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
  process.env.ADMIN_SESSION_SECRET = 'integration-session-secret'
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

test('admin login route sets the signed session cookie', async () => {
  configureAdminEnv()
  const totpCode = generateTotpCode(process.env.ADMIN_TOTP_SECRET!)

  const response = await loginRoute(
    new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.20',
      },
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME,
        password: 'very-strong-password',
        totpCode,
      }),
    })
  )

  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie') ?? '', /admin_session=/)
})

test('admin login route returns a generic 401 for invalid credentials', async () => {
  configureAdminEnv()

  const response = await loginRoute(
    new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.21',
      },
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME,
        password: 'wrong-password',
        totpCode: '000000',
      }),
    })
  )

  assert.equal(response.status, 401)
  assert.equal((await response.json()).error, 'Invalid admin credentials')
})

test('admin devices api rejects unauthenticated requests', async () => {
  const response = await listDevices(new Request('http://localhost/api/admin/devices'))
  assert.equal(response.status, 401)
})

test('middleware redirects unauthenticated admin page requests', async () => {
  process.env.ADMIN_SESSION_SECRET = 'integration-session-secret'

  const response = await middleware(new NextRequest('http://localhost/admin'))
  assert.equal(response?.status, 307)
  assert.equal(response?.headers.get('location'), 'http://localhost/admin/login?next=%2Fadmin')
})

test('middleware allows authenticated admin page requests', async () => {
  process.env.ADMIN_SESSION_SECRET = 'integration-session-secret'
  const cookieValue = await issueAdminSession('ops-admin')
  const response = await middleware(
    new NextRequest('http://localhost/admin', {
      headers: {
        cookie: `${buildAdminSessionCookie(cookieValue).name}=${encodeURIComponent(cookieValue)}`,
      },
    })
  )

  assert.equal(response?.status, 200)
})
